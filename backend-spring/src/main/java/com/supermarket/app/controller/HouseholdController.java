package com.supermarket.app.controller;

import com.supermarket.app.dto.Dtos.CreateHouseholdRequest;
import com.supermarket.app.dto.Dtos.HouseholdCreatedResponse;
import com.supermarket.app.dto.Dtos.HouseholdSummary;
import com.supermarket.app.dto.Dtos.JoinInviteRequest;
import com.supermarket.app.dto.Dtos.StateSyncRequest;
import com.supermarket.app.dto.Dtos.StoredStateResponse;
import com.supermarket.app.service.HouseholdService;
import com.supermarket.app.service.StateSnapshotService;
import com.supermarket.app.support.SecuritySupport;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Household membership, invite, and state snapshot endpoints.
 */
@RestController
public class HouseholdController {
  private final HouseholdService householdService;
  private final StateSnapshotService snapshots;

  HouseholdController(HouseholdService householdService, StateSnapshotService snapshots) {
    this.householdService = householdService;
    this.snapshots = snapshots;
  }

  @GetMapping("/api/households")
  List<HouseholdSummary> households(@AuthenticationPrincipal Jwt jwt) {
    return householdService.householdsForUser(SecuritySupport.userId(jwt));
  }

  @PostMapping("/api/households")
  HouseholdCreatedResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateHouseholdRequest request) {
    return householdService.createHousehold(SecuritySupport.userId(jwt), request.name());
  }

  @PostMapping("/api/households/join")
  HouseholdSummary join(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody JoinInviteRequest request) {
    return householdService.joinHousehold(SecuritySupport.userId(jwt), request.inviteCode());
  }

  @PostMapping("/api/households/{householdId}/invite/rotate")
  HouseholdCreatedResponse rotateInvite(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId) {
    UUID userId = SecuritySupport.userId(jwt);
    householdService.requireMember(userId, householdId);
    return householdService.rotateInvite(householdId);
  }

  @GetMapping("/api/households/{householdId}/state")
  StoredStateResponse state(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId) {
    householdService.requireMember(SecuritySupport.userId(jwt), householdId);
    return snapshots.readSnapshot(householdId);
  }

  @PostMapping("/api/households/{householdId}/state")
  StoredStateResponse syncState(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @Valid @RequestBody StateSyncRequest request) {
    UUID userId = SecuritySupport.userId(jwt);
    householdService.requireMember(userId, householdId);
    return snapshots.replaceFromClientState(householdId, userId, request.state(), Optional.ofNullable(request.summary()).orElse("Η λίστα ενημερώθηκε"));
  }
}
