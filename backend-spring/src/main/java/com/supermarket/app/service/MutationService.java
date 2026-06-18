package com.supermarket.app.service;

import com.supermarket.app.dto.Dtos.CategoryRow;
import com.supermarket.app.dto.Dtos.ItemMutationRequest;
import com.supermarket.app.dto.Dtos.StoredStateResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Applies granular household mutations and records activity events.
 */
@Service
public class MutationService {
  private final JdbcClient jdbc;
  private final StateSnapshotService snapshots;
  private final ActivityService activity;

  MutationService(JdbcClient jdbc, StateSnapshotService snapshots, ActivityService activity) {
    this.jdbc = jdbc;
    this.snapshots = snapshots;
    this.activity = activity;
  }

  /** Creates a shopping item and returns the rebuilt state snapshot. */
  @Transactional
  public StoredStateResponse createItem(UUID householdId, UUID actorId, ItemMutationRequest request) {
    String category = clean(request.category(), "Να μην ξεχάσω");
    snapshots.ensureCategory(householdId, category);
    jdbc.sql("""
        INSERT INTO shopping_items (id, household_id, category_name, name, barcode, status, quantity_count, quantity_note, estimated_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """).params(
        UUID.randomUUID(),
        householdId,
        category,
        clean(request.name(), "Προϊόν"),
        blankToNull(request.barcode()),
        clean(request.status(), "needed"),
        Math.max(1, Optional.ofNullable(request.quantityCount()).orElse(1)),
        Optional.ofNullable(request.quantityNote()).orElse(""),
        Optional.ofNullable(request.estimatedPrice()).orElse("")).update();
    activity.record(householdId, actorId, "ITEM_CREATED", "Προστέθηκε προϊόν: " + clean(request.name(), "Προϊόν"), Map.of("category", category));
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Partially updates a shopping item and returns the rebuilt state snapshot. */
  @Transactional
  public StoredStateResponse updateItem(UUID householdId, UUID itemId, UUID actorId, ItemMutationRequest request) {
    jdbc.sql("""
        UPDATE shopping_items
        SET name = COALESCE(?, name),
            category_name = COALESCE(?, category_name),
            barcode = COALESCE(?, barcode),
            status = COALESCE(?, status),
            quantity_count = COALESCE(?, quantity_count),
            quantity_note = COALESCE(?, quantity_note),
            estimated_price = COALESCE(?, estimated_price),
            updated_at = now()
        WHERE household_id = ? AND id = ?
        """).params(
        request.name(),
        request.category(),
        request.barcode(),
        request.status(),
        request.quantityCount(),
        request.quantityNote(),
        request.estimatedPrice(),
        householdId,
        itemId).update();
    if (request.category() != null) {
      snapshots.ensureCategory(householdId, request.category());
    }
    activity.record(householdId, actorId, "ITEM_UPDATED", "Ενημερώθηκε προϊόν", Map.of("itemId", itemId.toString()));
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Deletes a shopping item and returns the rebuilt state snapshot. */
  @Transactional
  public StoredStateResponse deleteItem(UUID householdId, UUID itemId, UUID actorId) {
    jdbc.sql("DELETE FROM shopping_items WHERE household_id = ? AND id = ?").params(householdId, itemId).update();
    activity.record(householdId, actorId, "ITEM_DELETED", "Διαγράφηκε προϊόν", Map.of("itemId", itemId.toString()));
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Creates a category if missing. */
  @Transactional
  public StoredStateResponse createCategory(UUID householdId, UUID actorId, String name) {
    snapshots.ensureCategory(householdId, name);
    activity.record(householdId, actorId, "CATEGORY_CREATED", "Προστέθηκε κατηγορία: " + clean(name, ""), Map.of());
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Renames a category and updates items and global learned product categories. */
  @Transactional
  public StoredStateResponse renameCategory(UUID householdId, UUID actorId, String currentName, String nextName) {
    String cleanNext = clean(nextName, currentName);
    jdbc.sql("UPDATE household_categories SET name = ?, updated_at = now() WHERE household_id = ? AND name = ?")
        .params(cleanNext, householdId, currentName).update();
    jdbc.sql("UPDATE shopping_items SET category_name = ? WHERE household_id = ? AND category_name = ?")
        .params(cleanNext, householdId, currentName).update();
    jdbc.sql("UPDATE barcode_products SET preferred_category = ?, updated_at = now() WHERE preferred_category = ?")
        .params(cleanNext, currentName).update();
    activity.record(householdId, actorId, "CATEGORY_RENAMED", "Μετονομάστηκε κατηγορία: " + currentName + " -> " + cleanNext, Map.of());
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Moves a category by one position. */
  @Transactional
  public StoredStateResponse moveCategory(UUID householdId, UUID actorId, String categoryName, int direction) {
    List<CategoryRow> categories = jdbc.sql("""
        SELECT name, sort_order
        FROM household_categories
        WHERE household_id = ?
        ORDER BY sort_order
        """).param(householdId).query((rs, rowNum) -> new CategoryRow(rs.getString("name"), rs.getInt("sort_order"))).list();
    int index = -1;
    for (int i = 0; i < categories.size(); i++) {
      if (categories.get(i).name().equals(categoryName)) {
        index = i;
      }
    }
    int target = index + Integer.signum(direction);
    if (index < 0 || target < 0 || target >= categories.size()) {
      return snapshots.readSnapshot(householdId);
    }
    java.util.Collections.swap(categories, index, target);
    for (int i = 0; i < categories.size(); i++) {
      jdbc.sql("UPDATE household_categories SET sort_order = ? WHERE household_id = ? AND name = ?")
          .params(-(i + 1), householdId, categories.get(i).name()).update();
    }
    for (int i = 0; i < categories.size(); i++) {
      jdbc.sql("UPDATE household_categories SET sort_order = ? WHERE household_id = ? AND name = ?")
          .params(i, householdId, categories.get(i).name()).update();
    }
    activity.record(householdId, actorId, "CATEGORY_MOVED", "Άλλαξε σειρά κατηγορίας: " + categoryName, Map.of("direction", direction));
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Records current have items as a home snapshot and moves them back to needed. */
  @Transactional
  public StoredStateResponse resetHave(UUID householdId, UUID actorId) {
    UUID snapshotId = UUID.randomUUID();
    jdbc.sql("INSERT INTO home_snapshots (id, household_id) VALUES (?, ?)").params(snapshotId, householdId).update();
    List<Map<String, Object>> haveItems = jdbc.sql("""
        SELECT id, barcode, category_name, name, quantity_count, quantity_note, estimated_price
        FROM shopping_items
        WHERE household_id = ? AND status = 'have'
        ORDER BY category_name, name
        """).param(householdId).query((rs, rowNum) -> {
          Map<String, Object> item = new HashMap<>();
          item.put("id", rs.getObject("id", UUID.class));
          item.put("barcode", rs.getString("barcode"));
          item.put("category", rs.getString("category_name"));
          item.put("name", rs.getString("name"));
          item.put("quantityCount", rs.getInt("quantity_count"));
          item.put("quantityNote", rs.getString("quantity_note"));
          item.put("estimatedPrice", rs.getString("estimated_price"));
          return item;
        }).list();
    for (int i = 0; i < haveItems.size(); i++) {
      Map<String, Object> item = haveItems.get(i);
      jdbc.sql("""
          INSERT INTO home_snapshot_items (id, snapshot_id, source_item_id, barcode, category_name, name, quantity_count, quantity_note, estimated_price, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """).params(UUID.randomUUID(), snapshotId, item.get("id"), item.get("barcode"), item.get("category"), item.get("name"), item.get("quantityCount"), item.get("quantityNote"), item.get("estimatedPrice"), i).update();
    }
    jdbc.sql("UPDATE shopping_items SET status = 'needed', updated_at = now() WHERE household_id = ? AND status = 'have'").param(householdId).update();
    activity.record(householdId, actorId, "RESET_HAVE", "Έγινε reset στο Έχω σπίτι", Map.of("items", haveItems.size()));
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Deletes all items currently marked as have. */
  @Transactional
  public StoredStateResponse clearHave(UUID householdId, UUID actorId) {
    int deleted = jdbc.sql("DELETE FROM shopping_items WHERE household_id = ? AND status = 'have'").param(householdId).update();
    activity.record(householdId, actorId, "CLEAR_HAVE", "Καθαρίστηκαν προϊόντα που υπάρχουν σπίτι", Map.of("items", deleted));
    return snapshots.rebuildSnapshot(householdId);
  }

  /** Deletes a saved home snapshot. */
  @Transactional
  public StoredStateResponse deleteSnapshot(UUID householdId, UUID snapshotId, UUID actorId) {
    jdbc.sql("DELETE FROM home_snapshots WHERE household_id = ? AND id = ?").params(householdId, snapshotId).update();
    activity.record(householdId, actorId, "SNAPSHOT_DELETED", "Διαγράφηκε καταγραφή σπιτιού", Map.of("snapshotId", snapshotId.toString()));
    return snapshots.rebuildSnapshot(householdId);
  }

  private String clean(String value, String fallback) {
    return Optional.ofNullable(value).map(String::trim).filter(text -> !text.isBlank()).orElse(fallback);
  }

  private String blankToNull(String value) {
    return Optional.ofNullable(value).map(String::trim).filter(text -> !text.isBlank()).orElse(null);
  }
}
