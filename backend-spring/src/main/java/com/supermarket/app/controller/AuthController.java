package com.supermarket.app.controller;

import com.supermarket.app.config.AppProperties;
import com.supermarket.app.dto.Dtos.AuthResponse;
import com.supermarket.app.dto.Dtos.AuthTokens;
import com.supermarket.app.dto.Dtos.JoinInviteRequest;
import com.supermarket.app.security.SecurityConfig;
import com.supermarket.app.service.AuthService;
import com.supermarket.app.service.HouseholdService;
import com.supermarket.app.support.CookieSupport;
import com.supermarket.app.support.NotAuthorizedException;
import com.supermarket.app.support.SecuritySupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication endpoints for guest invite login, token refresh, logout, and current profile.
 */
@RestController
public class AuthController {
  private final AuthService authService;
  private final HouseholdService householdService;
  private final AppProperties properties;

  AuthController(AuthService authService, HouseholdService householdService, AppProperties properties) {
    this.authService = authService;
    this.householdService = householdService;
    this.properties = properties;
  }

  @GetMapping("/api/health")
  Map<String, Object> health() {
    return Map.of("ok", true);
  }

  @PostMapping("/api/auth/guest/join")
  AuthResponse joinGuest(@Valid @RequestBody JoinInviteRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
    AuthTokens tokens = authService.joinGuest(request.inviteCode(), request.deviceLabel(), SecurityConfig.userAgent(servletRequest));
    SecurityConfig.addRefreshCookie(response, tokens.refreshToken(), properties);
    return authService.authResponse(tokens.accessToken(), tokens.userId(), tokens.activeHouseholdId());
  }

  @PostMapping("/api/auth/refresh")
  AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = CookieSupport.readCookie(request, "refresh_token").orElseThrow(NotAuthorizedException::new);
    AuthTokens tokens = authService.refresh(refreshToken, SecurityConfig.userAgent(request));
    SecurityConfig.addRefreshCookie(response, tokens.refreshToken(), properties);
    return authService.authResponse(tokens.accessToken(), tokens.userId(), tokens.activeHouseholdId());
  }

  @PostMapping("/api/auth/logout")
  ResponseEntity<Map<String, Object>> logout(HttpServletRequest request) {
    CookieSupport.readCookie(request, "refresh_token").ifPresent(authService::logout);
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, SecurityConfig.clearRefreshCookie(properties).toString())
        .body(Map.of("ok", true));
  }

  @GetMapping("/api/me")
  AuthResponse me(@AuthenticationPrincipal Jwt jwt) {
    UUID userId = SecuritySupport.userId(jwt);
    return authService.authResponse(null, userId, householdService.firstHouseholdId(userId).orElse(null));
  }
}
