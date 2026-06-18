package com.supermarket.app.service;

import com.supermarket.app.config.AppProperties;
import com.supermarket.app.dto.Dtos.AuthResponse;
import com.supermarket.app.dto.Dtos.AuthTokens;
import com.supermarket.app.dto.Dtos.RefreshToken;
import com.supermarket.app.dto.Dtos.UserProfile;
import com.supermarket.app.support.DeviceNames;
import com.supermarket.app.support.Hashing;
import com.supermarket.app.support.NotAuthorizedException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles guest login, Google user upsert, access JWTs, and refresh token rotation.
 */
@Service
public class AuthService {
  private final JdbcClient jdbc;
  private final JwtEncoder jwtEncoder;
  private final HouseholdService households;
  private final AppProperties properties;
  private final SecureRandom random = new SecureRandom();

  AuthService(JdbcClient jdbc, JwtEncoder jwtEncoder, HouseholdService households, AppProperties properties) {
    this.jdbc = jdbc;
    this.jwtEncoder = jwtEncoder;
    this.households = households;
    this.properties = properties;
  }

  /**
   * Creates a guest user and joins the household behind the invite code.
   *
   * @param inviteCode plain invite code supplied by the user
   * @param deviceLabel optional client label
   * @param userAgent request user-agent for fallback labels and token metadata
   * @return issued access and refresh tokens
   */
  @Transactional
  public AuthTokens joinGuest(String inviteCode, String deviceLabel, String userAgent) {
    UUID householdId = households.householdIdByInvite(inviteCode).orElseThrow(NotAuthorizedException::new);
    UUID userId = UUID.randomUUID();
    String label = Optional.ofNullable(deviceLabel).filter(value -> !value.isBlank()).orElse("Guest " + DeviceNames.fromUserAgent(userAgent));
    jdbc.sql("""
        INSERT INTO app_users (id, type, display_name)
        VALUES (?, 'GUEST', ?)
        """).params(userId, label).update();
    households.addMember(householdId, userId);
    return issueTokens(userId, householdId, userAgent, label);
  }

  /**
   * Upserts a Google user and issues local backend tokens.
   *
   * @param oidcUser authenticated Google OIDC principal
   * @param userAgent request user-agent for refresh token metadata
   * @return issued access and refresh tokens
   */
  @Transactional
  public AuthTokens loginGoogle(OidcUser oidcUser, String userAgent) {
    String sub = oidcUser.getSubject();
    Optional<UUID> existingUser = jdbc.sql("SELECT id FROM app_users WHERE google_sub = ?")
        .param(sub)
        .query(UUID.class)
        .optional();
    UUID userId = existingUser.orElseGet(UUID::randomUUID);
    String email = oidcUser.getEmail();
    String name = Optional.ofNullable(oidcUser.getFullName()).orElse(Optional.ofNullable(email).orElse("Google user"));
    String avatar = oidcUser.getPicture();

    if (existingUser.isPresent()) {
      jdbc.sql("""
          UPDATE app_users
          SET email = ?, display_name = ?, avatar_url = ?, updated_at = now()
          WHERE id = ?
          """).params(email, name, avatar, userId).update();
    } else {
      jdbc.sql("""
          INSERT INTO app_users (id, type, google_sub, email, display_name, avatar_url)
          VALUES (?, 'GOOGLE', ?, ?, ?, ?)
          """).params(userId, sub, email, name, avatar).update();
    }

    UUID activeHousehold = households.firstHouseholdId(userId).orElse(null);
    return issueTokens(userId, activeHousehold, userAgent, name);
  }

  /**
   * Rotates a valid refresh token and returns a fresh access token.
   *
   * @param refreshToken opaque refresh token from the HttpOnly cookie
   * @param userAgent request user-agent for new token metadata
   * @return newly issued access and refresh tokens
   */
  @Transactional
  public AuthTokens refresh(String refreshToken, String userAgent) {
    String hash = Hashing.sha256(refreshToken);
    RefreshToken token = jdbc.sql("""
        SELECT token_hash, user_id, expires_at, revoked_at, device_label
        FROM refresh_tokens
        WHERE token_hash = ?
        """).param(hash).query((rs, rowNum) -> new RefreshToken(
            rs.getString("token_hash"),
            rs.getObject("user_id", UUID.class),
            rs.getTimestamp("expires_at").toInstant(),
            Optional.ofNullable(rs.getTimestamp("revoked_at")).map(java.sql.Timestamp::toInstant).orElse(null),
            rs.getString("device_label"))).optional().orElseThrow(NotAuthorizedException::new);

    if (token.revokedAt() != null || token.expiresAt().isBefore(Instant.now())) {
      throw new NotAuthorizedException();
    }

    jdbc.sql("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = ?").param(hash).update();
    UUID householdId = households.firstHouseholdId(token.userId()).orElse(null);
    return issueTokens(token.userId(), householdId, userAgent, token.deviceLabel());
  }

  /**
   * Revokes a refresh token during logout.
   *
   * @param refreshToken opaque refresh token from the HttpOnly cookie
   */
  @Transactional
  public void logout(String refreshToken) {
    jdbc.sql("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = ?").param(Hashing.sha256(refreshToken)).update();
  }

  /**
   * Builds the profile response for the current authenticated user.
   *
   * @param accessToken optional access token to include after login or refresh
   * @param userId authenticated user id
   * @param activeHouseholdId selected household id when known
   * @return auth response consumed by the SPA
   */
  public AuthResponse authResponse(String accessToken, UUID userId, UUID activeHouseholdId) {
    UserProfile user = jdbc.sql("""
        SELECT id, type, email, display_name, avatar_url
        FROM app_users
        WHERE id = ?
        """).param(userId).query((rs, rowNum) -> new UserProfile(
            rs.getObject("id", UUID.class),
            rs.getString("type"),
            rs.getString("email"),
            rs.getString("display_name"),
            rs.getString("avatar_url"))).single();

    List<com.supermarket.app.dto.Dtos.HouseholdSummary> householdList = households.householdsForUser(userId);
    return new AuthResponse(accessToken, user, householdList, activeHouseholdId);
  }

  private AuthTokens issueTokens(UUID userId, UUID activeHouseholdId, String userAgent, String deviceLabel) {
    Instant issuedAt = Instant.now();
    Instant accessExpiresAt = issuedAt.plus(properties.accessTokenTtl());
    JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
        .subject(userId.toString())
        .issuedAt(issuedAt)
        .expiresAt(accessExpiresAt);
    if (activeHouseholdId != null) {
      claims.claim("household", activeHouseholdId.toString());
    }
    String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();
    String refreshToken = randomToken();
    jdbc.sql("""
        INSERT INTO refresh_tokens (token_hash, user_id, expires_at, user_agent, device_label)
        VALUES (?, ?, ?, ?, ?)
        """).params(Hashing.sha256(refreshToken), userId, java.sql.Timestamp.from(issuedAt.plus(properties.refreshTokenTtl())), userAgent, deviceLabel).update();
    return new AuthTokens(accessToken, refreshToken, userId, activeHouseholdId);
  }

  private String randomToken() {
    byte[] bytes = new byte[36];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
