package com.supermarket.app.controller;

import com.supermarket.app.dto.Dtos.CategoryMutationRequest;
import com.supermarket.app.dto.Dtos.ItemMutationRequest;
import com.supermarket.app.dto.Dtos.MoveCategoryRequest;
import com.supermarket.app.dto.Dtos.StoredStateResponse;
import com.supermarket.app.service.HouseholdService;
import com.supermarket.app.service.MutationService;
import com.supermarket.app.support.SecuritySupport;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Granular household mutation endpoints for items, categories, and home snapshots.
 */
@RestController
public class MutationController {
  private final HouseholdService households;
  private final MutationService mutations;

  MutationController(HouseholdService households, MutationService mutations) {
    this.households = households;
    this.mutations = mutations;
  }

  @PostMapping("/api/households/{householdId}/items")
  StoredStateResponse createItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @Valid @RequestBody ItemMutationRequest request) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.createItem(householdId, userId, request);
  }

  @PatchMapping("/api/households/{householdId}/items/{itemId}")
  StoredStateResponse updateItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @PathVariable UUID itemId, @RequestBody ItemMutationRequest request) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.updateItem(householdId, itemId, userId, request);
  }

  @DeleteMapping("/api/households/{householdId}/items/{itemId}")
  StoredStateResponse deleteItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @PathVariable UUID itemId) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.deleteItem(householdId, itemId, userId);
  }

  @PostMapping("/api/households/{householdId}/categories")
  StoredStateResponse createCategory(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @Valid @RequestBody CategoryMutationRequest request) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.createCategory(householdId, userId, request.name());
  }

  @PatchMapping("/api/households/{householdId}/categories/{categoryName}")
  StoredStateResponse renameCategory(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @PathVariable String categoryName, @Valid @RequestBody CategoryMutationRequest request) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.renameCategory(householdId, userId, categoryName, request.name());
  }

  @PostMapping("/api/households/{householdId}/categories/{categoryName}/move")
  StoredStateResponse moveCategory(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @PathVariable String categoryName, @Valid @RequestBody MoveCategoryRequest request) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.moveCategory(householdId, userId, categoryName, request.direction());
  }

  @PostMapping("/api/households/{householdId}/actions/reset-have")
  StoredStateResponse resetHave(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.resetHave(householdId, userId);
  }

  @PostMapping("/api/households/{householdId}/actions/clear-have")
  StoredStateResponse clearHave(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.clearHave(householdId, userId);
  }

  @DeleteMapping("/api/households/{householdId}/home-snapshots/{snapshotId}")
  StoredStateResponse deleteSnapshot(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID householdId, @PathVariable UUID snapshotId) {
    UUID userId = SecuritySupport.userId(jwt);
    households.requireMember(userId, householdId);
    return mutations.deleteSnapshot(householdId, snapshotId, userId);
  }
}
