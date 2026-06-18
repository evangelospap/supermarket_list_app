package com.supermarket.app.controller;

import com.supermarket.app.dto.Dtos.ActivityEntry;
import com.supermarket.app.service.ActivityService;
import com.supermarket.app.service.HouseholdService;
import com.supermarket.app.support.SecuritySupport;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Provides the compact household activity feed.
 */
@RestController
public class ActivityController {
  private final HouseholdService households;
  private final ActivityService activity;

  ActivityController(HouseholdService households, ActivityService activity) {
    this.households = households;
    this.activity = activity;
  }

  @GetMapping("/api/households/{householdId}/activity")
  List<ActivityEntry> activity(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @RequestParam(defaultValue = "50") int limit) {
    households.requireMember(SecuritySupport.userId(jwt), householdId);
    return activity.recent(householdId, Math.max(1, Math.min(100, limit)));
  }
}
