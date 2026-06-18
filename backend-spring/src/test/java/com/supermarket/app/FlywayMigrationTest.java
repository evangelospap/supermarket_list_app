package com.supermarket.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@Testcontainers(disabledWithoutDocker = true)
class FlywayMigrationTest {
  @Container
  static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17")
      .withDatabaseName("supermarket")
      .withUsername("supermarket")
      .withPassword("supermarket");

  @Test
  void migrationCreatesHouseholdBackendTables() {
    DriverManagerDataSource dataSource = new DriverManagerDataSource(
        postgres.getJdbcUrl(),
        postgres.getUsername(),
        postgres.getPassword());

    Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration")
        .load()
        .migrate();

    JdbcClient jdbc = JdbcClient.create(dataSource);
    List<String> tables = jdbc.sql("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        """).query(String.class).list();

    assertThat(tables).contains(
        "app_users",
        "households",
        "household_members",
        "shopping_items",
        "barcode_products",
        "household_events",
        "household_state_snapshots");
  }
}
