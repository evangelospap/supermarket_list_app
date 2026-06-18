package com.supermarket.app.service;

import com.supermarket.app.config.AppProperties;
import com.supermarket.app.dto.Dtos.HouseholdCreatedResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Imports the old single-household JSON state into PostgreSQL when explicitly enabled.
 */
@Component
public class LegacyStateImportService implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(LegacyStateImportService.class);
  private final AppProperties properties;
  private final JdbcClient jdbc;
  private final ObjectMapper objectMapper;
  private final HouseholdService households;
  private final StateSnapshotService snapshots;

  LegacyStateImportService(AppProperties properties, JdbcClient jdbc, ObjectMapper objectMapper, HouseholdService households, StateSnapshotService snapshots) {
    this.properties = properties;
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
    this.households = households;
    this.snapshots = snapshots;
  }

  /**
   * Imports legacy state only when IMPORT_LEGACY_STATE=true and no households exist.
   */
  @Override
  @Transactional
  public void run(ApplicationArguments args) throws Exception {
    if (!properties.importLegacyState()) {
      return;
    }
    Integer existing = jdbc.sql("SELECT COUNT(*) FROM households").query(Integer.class).single();
    if (existing > 0) {
      return;
    }
    Path legacyPath = Path.of(properties.legacyStateFile()).toAbsolutePath().normalize();
    if (!Files.exists(legacyPath)) {
      return;
    }

    JsonNode payload = objectMapper.readTree(Files.readString(legacyPath));
    JsonNode state = payload.has("state") ? payload.path("state") : payload;
    UUID importer = UUID.randomUUID();
    jdbc.sql("""
        INSERT INTO app_users (id, type, display_name)
        VALUES (?, 'GUEST', 'Legacy importer')
        """).params(importer, "Legacy importer").update();
    HouseholdCreatedResponse household = households.createHousehold(importer, "Το σπίτι μου");
    snapshots.replaceFromClientState(household.household().id(), importer, state, "Έγινε import από το παλιό JSON state");
    log.warn("Imported legacy supermarket state into household '{}' with invite code: {}", household.household().name(), household.inviteCode());
  }
}
