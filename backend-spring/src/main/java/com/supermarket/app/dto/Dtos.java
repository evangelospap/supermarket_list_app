package com.supermarket.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/**
 * API and internal data-transfer records for the household backend.
 */
public final class Dtos {
  private Dtos() {}

  /** Token bundle issued after login or refresh. */
  public record AuthTokens(String accessToken, String refreshToken, UUID userId, UUID activeHouseholdId) {}

  /** Stored refresh token metadata used during refresh rotation. */
  public record RefreshToken(String tokenHash, UUID userId, Instant expiresAt, Instant revokedAt, String deviceLabel) {}

  /** Category ordering row used by reorder mutations. */
  public record CategoryRow(String name, int sortOrder) {}

  /** Request for joining a household with a rotatable invite code. */
  public record JoinInviteRequest(@NotBlank String inviteCode, String deviceLabel) {}

  /** Request for creating a household. */
  public record CreateHouseholdRequest(@NotBlank String name) {}

  /** Request for creating or renaming a category. */
  public record CategoryMutationRequest(@NotBlank String name) {}

  /** Request for moving a category by one position. */
  public record MoveCategoryRequest(int direction) {}

  /** Request for replacing a household state snapshot from the SPA. */
  public record StateSyncRequest(@NotNull JsonNode state, String summary) {}

  /** Request for creating or partially updating a shopping item. */
  public record ItemMutationRequest(
      String name,
      String category,
      String barcode,
      String status,
      Integer quantityCount,
      String quantityNote,
      String estimatedPrice) {}

  /** Authenticated user profile returned to the SPA. */
  public record UserProfile(UUID id, String type, String email, String displayName, String avatarUrl) {}

  /** Household list entry returned to the SPA. */
  public record HouseholdSummary(UUID id, String name) {}

  /** Household creation/rotation response that includes the plain invite code once. */
  public record HouseholdCreatedResponse(HouseholdSummary household, String inviteCode) {}

  /** Authentication response containing the access token and accessible households. */
  public record AuthResponse(String accessToken, UserProfile user, List<HouseholdSummary> households, UUID activeHouseholdId) {}

  /** Persisted frontend-shaped household state snapshot. */
  public record StoredStateResponse(JsonNode state, long version, String updatedAt) {}

  /** Compact recent activity feed entry. */
  public record ActivityEntry(UUID id, String actorName, String type, String summary, JsonNode payload, String occurredAt) {}

  /** Product payload returned by learned products or Open Food Facts. */
  public record ProductPayload(String code, String name, String brand, String quantity, String category, String source) {}

  /** Barcode lookup response used by the product scanner. */
  public record ProductLookupResponse(String code, boolean found, ProductPayload product) {}
}
