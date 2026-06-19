package com.supermarket.app.service;

import com.supermarket.app.dto.Dtos.StoredStateResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.postgresql.util.PGobject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Maintains frontend-shaped household state snapshots from normalized tables.
 */
@Service
public class StateSnapshotService {
  private static final Logger log = LoggerFactory.getLogger(StateSnapshotService.class);
  private static final String PINNED_LAST_CATEGORY = "Να μην ξεχάσω";
  private static final List<String> DEFAULT_CATEGORIES = List.of(
      "Μαναβική", "Γαλακτοκομικά", "Κρέας / Ψάρια", "Αλλαντικά / Τυριά", "Κατάψυξη",
      "Ζυμαρικά / Ρύζι", "Κονσέρβες / Σάλτσες", "Πρωινό / Καφέδες", "Σνακ / Γλυκά", "Ποτά",
      "Καθαριότητα", "Προσωπική φροντίδα", "Χαρτικά", PINNED_LAST_CATEGORY);

  private final JdbcClient jdbc;
  private final ObjectMapper objectMapper;
  private final ActivityService activity;

  StateSnapshotService(JdbcClient jdbc, ObjectMapper objectMapper, ObjectProvider<ActivityService> activity) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
    this.activity = activity.getIfAvailable();
  }

  /** Ensures a household has the default category set with the reminder category last. */
  public void ensureDefaults(UUID householdId) {
    Integer count = jdbc.sql("SELECT COUNT(*) FROM household_categories WHERE household_id = ?")
        .param(householdId)
        .query(Integer.class)
        .single();
    if (count!=null && count > 0) {
      return;
    }
    for (int index = 0; index < DEFAULT_CATEGORIES.size(); index++) {
      jdbc.sql("""
          INSERT INTO household_categories (id, household_id, name, sort_order)
          VALUES (?, ?, ?, ?)
          ON CONFLICT DO NOTHING
          """).params(UUID.randomUUID(), householdId, DEFAULT_CATEGORIES.get(index), index).update();
    }
  }

  /** Reads the latest household snapshot, rebuilding it when missing. */
  @Transactional
  public StoredStateResponse readSnapshot(UUID householdId) {
    ensureDefaults(householdId);
    return jdbc.sql("""
        SELECT state_json::text, version, updated_at
        FROM household_state_snapshots
        WHERE household_id = ?
        """).param(householdId).query((rs, rowNum) -> {
          try {
            return new StoredStateResponse(objectMapper.readTree(rs.getString("state_json")), rs.getLong("version"), rs.getTimestamp("updated_at").toInstant().toString());
          } catch (RuntimeException exception) {
            throw new IllegalStateException(exception);
          }
        }).optional().orElseGet(() -> rebuildSnapshot(householdId));
  }

  /** Replaces normalized household data from a frontend-shaped state document. */
  @Transactional
  public StoredStateResponse replaceFromClientState(UUID householdId, UUID actorId, JsonNode state, String summary) {
    ensureDefaults(householdId);
    replaceCategories(householdId, state.path("categories"));
    replaceItems(householdId, state.path("items"));
    replaceHomeSnapshots(householdId, state.path("homeSnapshots"));
    replaceLearnedProducts(state.path("learnedProducts"));
    StoredStateResponse response = rebuildSnapshot(householdId);
    if (activity != null) {
      activity.record(householdId, actorId, "STATE_SYNCED", summary, Map.of("version", response.version()));
    }
    return response;
  }

  /** Rebuilds and persists the household JSON snapshot. */
  public StoredStateResponse rebuildSnapshot(UUID householdId) {
    ObjectNode state = objectMapper.createObjectNode();
    state.set("categories", objectMapper.valueToTree(categories(householdId)));
    state.set("items", objectMapper.valueToTree(items(householdId)));
    state.set("homeSnapshots", objectMapper.valueToTree(homeSnapshots(householdId)));
    state.set("learnedProducts", objectMapper.valueToTree(learnedProducts()));

    Long nextVersion = jdbc.sql("""
        INSERT INTO household_state_snapshots (household_id, state_json, version, updated_at)
        VALUES (?, ?, 1, now())
        ON CONFLICT (household_id)
        DO UPDATE SET state_json = EXCLUDED.state_json,
                      version = household_state_snapshots.version + 1,
                      updated_at = now()
        RETURNING version
        """).params(householdId, jsonb(state)).query(Long.class).single();

    String updatedAt = jdbc.sql("SELECT updated_at FROM household_state_snapshots WHERE household_id = ?")
        .param(householdId)
        .query((rs, rowNum) -> rs.getTimestamp("updated_at").toInstant().toString())
        .single();
    return new StoredStateResponse(state, nextVersion, updatedAt);
  }

  /** Adds a category to a household when it does not already exist. */
  public void ensureCategory(UUID householdId, String categoryName) {
    String name = clean(categoryName, "Να μην ξεχάσω");
    Integer existing = jdbc.sql("SELECT COUNT(*) FROM household_categories WHERE household_id = ? AND name = ?")
        .params(householdId, name)
        .query(Integer.class)
        .single();
    if (existing != null && existing > 0) {
      return;
    }
    Integer nextOrder = jdbc.sql("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM household_categories WHERE household_id = ?")
        .param(householdId)
        .query(Integer.class)
        .single();
    jdbc.sql("""
        INSERT INTO household_categories (id, household_id, name, sort_order)
        VALUES (?, ?, ?, ?)
        """).params(UUID.randomUUID(), householdId, name, nextOrder).update();
  }

  private List<String> categories(UUID householdId) {
    return jdbc.sql("""
        SELECT name
        FROM household_categories
        WHERE household_id = ?
        ORDER BY CASE WHEN name = ? THEN 1 ELSE 0 END, sort_order, name
        """)
        .param(householdId)
        .param(PINNED_LAST_CATEGORY)
        .query(String.class)
        .list();
  }

  private List<Map<String, Object>> items(UUID householdId) {
    return jdbc.sql("""
        SELECT id, category_name, name, barcode, status, quantity_count, quantity_note, estimated_price, created_at
        FROM shopping_items
        WHERE household_id = ?
        ORDER BY created_at DESC
        """).param(householdId).query((rs, rowNum) -> {
          Map<String, Object> item = new LinkedHashMap<>();
          item.put("id", rs.getString("id"));
          item.put("category", rs.getString("category_name"));
          item.put("name", rs.getString("name"));
          item.put("barcode", rs.getString("barcode"));
          item.put("status", rs.getString("status"));
          item.put("quantityCount", rs.getInt("quantity_count"));
          item.put("quantityNote", rs.getString("quantity_note"));
          item.put("estimatedPrice", rs.getString("estimated_price"));
          item.put("createdAt", rs.getTimestamp("created_at").toInstant().toEpochMilli());
          return item;
        }).list();
  }

  private List<Map<String, Object>> homeSnapshots(UUID householdId) {
    List<Map<String, Object>> snapshots = jdbc.sql("""
        SELECT id, created_at
        FROM home_snapshots
        WHERE household_id = ?
        ORDER BY created_at DESC
        """).param(householdId).query((rs, rowNum) -> {
          Map<String, Object> snapshot = new LinkedHashMap<>();
          snapshot.put("id", rs.getString("id"));
          snapshot.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
          snapshot.put("items", new ArrayList<>());
          return snapshot;
        }).list();

    for (Map<String, Object> snapshot : snapshots) {
      UUID snapshotId = UUID.fromString(String.valueOf(snapshot.get("id")));
      List<Map<String, Object>> snapshotItems = jdbc.sql("""
          SELECT source_item_id, barcode, category_name, name, quantity_count, quantity_note, estimated_price
          FROM home_snapshot_items
          WHERE snapshot_id = ?
          ORDER BY sort_order
          """).param(snapshotId).query((rs, rowNum) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", Optional.ofNullable(rs.getString("source_item_id")).orElse(UUID.randomUUID().toString()));
            item.put("barcode", rs.getString("barcode"));
            item.put("category", rs.getString("category_name"));
            item.put("name", rs.getString("name"));
            item.put("quantityCount", rs.getInt("quantity_count"));
            item.put("quantityNote", rs.getString("quantity_note"));
            item.put("estimatedPrice", rs.getString("estimated_price"));
            return item;
          }).list();
      snapshot.put("items", snapshotItems);
    }
    return snapshots;
  }

  private Map<String, Map<String, Object>> learnedProducts() {
    Map<String, Map<String, Object>> products = new LinkedHashMap<>();
    jdbc.sql("""
        SELECT barcode, name, preferred_category, updated_at
        FROM barcode_products
        ORDER BY updated_at DESC
        """).query(rs -> {
          Map<String, Object> product = new LinkedHashMap<>();
          product.put("code", rs.getString("barcode"));
          product.put("name", rs.getString("name"));
          product.put("category", rs.getString("preferred_category"));
          product.put("updatedAt", rs.getTimestamp("updated_at").toInstant().toString());
          products.put(rs.getString("barcode"), product);
        });
    return products;
  }

  private void replaceCategories(UUID householdId, JsonNode categories) {
    jdbc.sql("DELETE FROM household_categories WHERE household_id = ?").param(householdId).update();
    int order = 0;
    if (categories.isArray()) {
      for (JsonNode category : categories) {
        String name = clean(category.asString(), "");
        if (!name.isBlank()) {
          jdbc.sql("""
              INSERT INTO household_categories (id, household_id, name, sort_order)
              VALUES (?, ?, ?, ?)
              ON CONFLICT DO NOTHING
              """).params(UUID.randomUUID(), householdId, name, order++).update();
        }
      }
    }
    ensureDefaults(householdId);
  }

  private void replaceItems(UUID householdId, JsonNode items) {
    jdbc.sql("DELETE FROM shopping_items WHERE household_id = ?").param(householdId).update();
    if (!items.isArray()) {
      return;
    }
    for (JsonNode item : items) {
      String category = clean(item.path("category").asString(), "Να μην ξεχάσω");
      ensureCategory(householdId, category);
      jdbc.sql("""
          INSERT INTO shopping_items (id, household_id, category_name, name, barcode, status, quantity_count, quantity_note, estimated_price, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
          """).params(
          uuidOrRandom(item.path("id").asString()),
          householdId,
          category,
          clean(item.path("name").asString(), "Προϊόν"),
          blankToNull(item.path("barcode").asString(null)),
          status(item.path("status").asString("needed")),
          Math.max(1, item.path("quantityCount").asInt(1)),
          item.path("quantityNote").asString(""),
          item.path("estimatedPrice").asString(""),
          java.sql.Timestamp.from(createdAt(item.path("createdAt")))).update();
    }
  }

  private void replaceHomeSnapshots(UUID householdId, JsonNode snapshots) {
    jdbc.sql("DELETE FROM home_snapshots WHERE household_id = ?").param(householdId).update();
    if (!snapshots.isArray()) {
      return;
    }
    for (JsonNode snapshot : snapshots) {
      UUID snapshotId = uuidOrRandom(snapshot.path("id").asString());
      jdbc.sql("INSERT INTO home_snapshots (id, household_id, created_at) VALUES (?, ?, ?)")
          .params(snapshotId, householdId, java.sql.Timestamp.from(createdAt(snapshot.path("createdAt"))))
          .update();
      int order = 0;
      for (JsonNode item : snapshot.path("items")) {
        jdbc.sql("""
            INSERT INTO home_snapshot_items (id, snapshot_id, source_item_id, barcode, category_name, name, quantity_count, quantity_note, estimated_price, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """).params(
            UUID.randomUUID(),
            snapshotId,
            nullableUuid(item.path("id").asString()),
            blankToNull(item.path("barcode").asString(null)),
            clean(item.path("category").asString(), "Να μην ξεχάσω"),
            clean(item.path("name").asString(), "Προϊόν"),
            Math.max(1, item.path("quantityCount").asInt(1)),
            item.path("quantityNote").asString(""),
            item.path("estimatedPrice").asString(""),
            order++).update();
      }
    }
  }

  private void replaceLearnedProducts(JsonNode learnedProducts) {
    if (!learnedProducts.isObject()) {
      return;
    }
    learnedProducts.properties().forEach(entry -> {
      String barcode = clean(entry.getKey(), "");
      JsonNode product = entry.getValue();
      if (!barcode.isBlank() && product.hasNonNull("name")) {
        jdbc.sql("""
            INSERT INTO barcode_products (barcode, name, preferred_category, source, updated_at)
            VALUES (?, ?, ?, 'learned', now())
            ON CONFLICT (barcode)
            DO UPDATE SET name = EXCLUDED.name,
                          preferred_category = EXCLUDED.preferred_category,
                          source = EXCLUDED.source,
                          updated_at = now()
            """).params(barcode, product.path("name").asString(), clean(product.path("category").asString(), "Να μην ξεχάσω")).update();
      }
    });
  }

  private PGobject jsonb(Object value) {
    try {
      PGobject pg = new PGobject();
      pg.setType("jsonb");
      pg.setValue(objectMapper.writeValueAsString(value));
      return pg;
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }

  private UUID uuidOrRandom(String value) {
    return Optional.ofNullable(nullableUuid(value)).orElseGet(UUID::randomUUID);
  }

  private UUID nullableUuid(String value) {
    try {
      return value == null || value.isBlank() ? null : UUID.fromString(value);
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private Instant createdAt(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return Instant.now();
    }
    if (node.isNumber()) {
      return Instant.ofEpochMilli(node.asLong());
    }
    try {
      return Instant.parse(node.asString());
    } catch (Exception exception) {
      log.debug("Ignoring invalid timestamp {}", node.asString());
      return Instant.now();
    }
  }

  private String status(String value) {
    return switch (value) {
      case "needed", "notNeeded", "have" -> value;
      default -> "needed";
    };
  }

  private String clean(String value, String fallback) {
    return Optional.ofNullable(value).map(String::trim).filter(text -> !text.isBlank()).orElse(fallback);
  }

  private String blankToNull(String value) {
    return Optional.ofNullable(value).map(String::trim).filter(text -> !text.isBlank()).orElse(null);
  }
}
