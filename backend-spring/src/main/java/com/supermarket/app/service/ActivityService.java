package com.supermarket.app.service;

import com.supermarket.app.dto.Dtos.ActivityEntry;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.postgresql.util.PGobject;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes append-only household events and reads the compact activity feed.
 */
@Service
public class ActivityService {
  private final JdbcClient jdbc;
  private final ObjectMapper objectMapper;

  ActivityService(JdbcClient jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  /** Records a household event for future analytics and activity display. */
  public void record(UUID householdId, UUID actorId, String type, String summary, Map<String, ?> payload) {
    jdbc.sql("""
        INSERT INTO household_events (id, household_id, actor_user_id, type, summary, payload)
        VALUES (?, ?, ?, ?, ?, ?)
        """).params(UUID.randomUUID(), householdId, actorId, type, summary, jsonb(payload)).update();
  }

  /** Reads the most recent household events. */
  public List<ActivityEntry> recent(UUID householdId, int limit) {
    return jdbc.sql("""
        SELECT e.id, e.type, e.summary, e.payload::text, e.occurred_at, u.display_name
        FROM household_events e
        LEFT JOIN app_users u ON u.id = e.actor_user_id
        WHERE e.household_id = ?
        ORDER BY e.occurred_at DESC
        LIMIT ?
        """).params(householdId, limit).query((rs, rowNum) -> {
          try {
            return new ActivityEntry(
                rs.getObject("id", UUID.class),
                Optional.ofNullable(rs.getString("display_name")).orElse("Άγνωστος"),
                rs.getString("type"),
                rs.getString("summary"),
                objectMapper.readTree(rs.getString("payload")),
                rs.getTimestamp("occurred_at").toInstant().toString());
          } catch (RuntimeException exception) {
            throw new IllegalStateException(exception);
          }
        }).list();
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
}
