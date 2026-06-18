package com.supermarket.app.service;

import com.supermarket.app.dto.Dtos.HouseholdCreatedResponse;
import com.supermarket.app.dto.Dtos.HouseholdSummary;
import com.supermarket.app.support.Hashing;
import com.supermarket.app.support.NotAuthorizedException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages household creation, invite code lookup, and membership checks.
 */
@Service
public class HouseholdService {
  private final JdbcClient jdbc;
  private final StateSnapshotService snapshots;
  private final SecureRandom random = new SecureRandom();

  HouseholdService(JdbcClient jdbc, ObjectProvider<StateSnapshotService> snapshots) {
    this.jdbc = jdbc;
    this.snapshots = snapshots.getIfAvailable();
  }

  /** Creates a household and returns its one-time plain invite code. */
  @Transactional
  public HouseholdCreatedResponse createHousehold(UUID userId, String name) {
    UUID id = UUID.randomUUID();
    String inviteCode = inviteCode();
    String cleanName = cleanName(name, "Νέο σπίτι");
    jdbc.sql("""
        INSERT INTO households (id, name, invite_code_hash)
        VALUES (?, ?, ?)
        """).params(id, cleanName, Hashing.sha256(inviteCode)).update();
    addMember(id, userId);
    if (snapshots != null) {
      snapshots.ensureDefaults(id);
      snapshots.rebuildSnapshot(id);
    }
    return new HouseholdCreatedResponse(new HouseholdSummary(id, cleanName), inviteCode);
  }

  /** Joins an existing household using an invite code. */
  @Transactional
  public HouseholdSummary joinHousehold(UUID userId, String inviteCode) {
    UUID householdId = householdIdByInvite(inviteCode).orElseThrow(NotAuthorizedException::new);
    addMember(householdId, userId);
    return household(householdId);
  }

  /** Rotates the household invite code and returns the new plain code once. */
  @Transactional
  public HouseholdCreatedResponse rotateInvite(UUID householdId) {
    String inviteCode = inviteCode();
    jdbc.sql("""
        UPDATE households
        SET invite_code_hash = ?, invite_code_rotated_at = now(), updated_at = now()
        WHERE id = ?
        """).params(Hashing.sha256(inviteCode), householdId).update();
    return new HouseholdCreatedResponse(household(householdId), inviteCode);
  }

  /** Adds a user to a household if not already present. */
  public void addMember(UUID householdId, UUID userId) {
    jdbc.sql("""
        INSERT INTO household_members (household_id, user_id)
        VALUES (?, ?)
        ON CONFLICT DO NOTHING
        """).params(householdId, userId).update();
  }

  /** Resolves the household id for a plain invite code. */
  public Optional<UUID> householdIdByInvite(String inviteCode) {
    if (inviteCode == null || inviteCode.isBlank()) {
      return Optional.empty();
    }
    return jdbc.sql("SELECT id FROM households WHERE invite_code_hash = ?")
        .param(Hashing.sha256(inviteCode.trim()))
        .query(UUID.class)
        .optional();
  }

  /** Throws when a user is not a member of the target household. */
  public void requireMember(UUID userId, UUID householdId) {
    boolean exists = jdbc.sql("""
        SELECT EXISTS (
          SELECT 1 FROM household_members
          WHERE user_id = ? AND household_id = ?
        )
        """).params(userId, householdId).query(Boolean.class).single();
    if (!exists) {
      throw new NotAuthorizedException();
    }
  }

  /** Returns the first household joined by a user, if any. */
  public Optional<UUID> firstHouseholdId(UUID userId) {
    return jdbc.sql("""
        SELECT h.id
        FROM households h
        JOIN household_members hm ON hm.household_id = h.id
        WHERE hm.user_id = ?
        ORDER BY hm.joined_at
        LIMIT 1
        """).param(userId).query(UUID.class).optional();
  }

  /** Lists all households available to a user. */
  public List<HouseholdSummary> householdsForUser(UUID userId) {
    return jdbc.sql("""
        SELECT h.id, h.name
        FROM households h
        JOIN household_members hm ON hm.household_id = h.id
        WHERE hm.user_id = ?
        ORDER BY hm.joined_at, h.name
        """).param(userId).query((rs, rowNum) -> new HouseholdSummary(rs.getObject("id", UUID.class), rs.getString("name"))).list();
  }

  /** Reads a household summary by id. */
  public HouseholdSummary household(UUID householdId) {
    return jdbc.sql("SELECT id, name FROM households WHERE id = ?")
        .param(householdId)
        .query((rs, rowNum) -> new HouseholdSummary(rs.getObject("id", UUID.class), rs.getString("name")))
        .single();
  }

  private String inviteCode() {
    byte[] bytes = new byte[8];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).replace("-", "").replace("_", "").substring(0, 10).toUpperCase();
  }

  private String cleanName(String name, String fallback) {
    return Optional.ofNullable(name).map(String::trim).filter(value -> !value.isBlank()).orElse(fallback);
  }
}
