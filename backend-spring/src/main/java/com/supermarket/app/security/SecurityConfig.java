package com.supermarket.app.security;

import com.supermarket.app.config.AppProperties;
import com.supermarket.app.dto.Dtos.AuthTokens;
import com.supermarket.app.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

/**
 * Configures JWT API security and optional Google OAuth login.
 */
@Configuration
public class SecurityConfig {
  private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);
  private final AppProperties properties;

  SecurityConfig(AppProperties properties) {
    this.properties = properties;
  }

  /**
   * Builds the HTTP security filter chain for API and frontend routes.
   *
   * @param http Spring security builder
   * @param clients optional OAuth client registrations
   * @param googleSuccessHandler success handler that issues local backend tokens
   * @return configured filter chain
   * @throws Exception when Spring Security cannot build the filter chain
   */
  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      ObjectProvider<ClientRegistrationRepository> clients,
      AuthenticationSuccessHandler googleSuccessHandler) {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/", "/index.html", "/assets/**", "/api/health", "/api/auth/guest/**", "/api/auth/refresh", "/api/products/**").permitAll()
            .requestMatchers("/oauth2/**", "/login/oauth2/**", "/auth/callback").permitAll()
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));

    if (clients.getIfAvailable() != null) {
      http.oauth2Login(oauth -> oauth
          .successHandler(googleSuccessHandler)
          .failureHandler((request, response, exception) -> {
            log.error("Google OAuth callback failed", exception);
            response.sendRedirect("/auth/callback?error=oauth_callback");
          }));
    }

    return http.build();
  }

  /**
   * Creates the HS256 JWT encoder used for one-hour access tokens.
   *
   * @return JWT encoder backed by the configured shared secret
   */
  @Bean
  public JwtEncoder jwtEncoder() {
    return new NimbusJwtEncoder(new com.nimbusds.jose.jwk.source.ImmutableSecret<>(jwtSecret().getEncoded()));
  }

  /**
   * Creates the HS256 JWT decoder used by the resource server.
   *
   * @return JWT decoder backed by the configured shared secret
   */
  @Bean
  public JwtDecoder jwtDecoder() {
    return NimbusJwtDecoder.withSecretKey(jwtSecret()).macAlgorithm(MacAlgorithm.HS256).build();
  }

  /**
   * Issues local JWT and refresh cookie after a successful Google OAuth login.
   *
   * @param authService authentication service that upserts Google users
   * @return OAuth authentication success handler
   */
  @Bean
  public AuthenticationSuccessHandler googleSuccessHandler(AuthService authService) {
    return (request, response, authentication) -> {
      if (!(authentication.getPrincipal() instanceof OidcUser oidcUser)) {
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      try {
        AuthTokens tokens = authService.loginGoogle(oidcUser, userAgent(request));
        addRefreshCookie(response, tokens.refreshToken(), properties);
        response.sendRedirect("/auth/callback");
      } catch (Exception error) {
        log.error("Google OAuth login succeeded, but local session creation failed", error);
        response.sendRedirect("/auth/callback?error=oauth_session");
      }
    };
  }

  /**
   * Adds the refresh cookie used by the SPA to renew access tokens.
   *
   * @param response servlet response
   * @param refreshToken opaque refresh token value
   * @param properties cookie security settings
   */
  public static void addRefreshCookie(HttpServletResponse response, String refreshToken, AppProperties properties) {
    ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
        .httpOnly(true)
        .secure(properties.cookieSecure())
        .sameSite("Lax")
        .path("/")
        .maxAge(properties.refreshTokenTtl())
        .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  /**
   * Builds an expired refresh cookie for logout.
   *
   * @param properties cookie security settings
   * @return expired cookie header value
   */
  public static ResponseCookie clearRefreshCookie(AppProperties properties) {
    return ResponseCookie.from("refresh_token", "")
        .httpOnly(true)
        .secure(properties.cookieSecure())
        .sameSite("Lax")
        .path("/")
        .maxAge(0)
        .build();
  }

  /**
   * Reads the user agent used for guest device labels and refresh token metadata.
   *
   * @param request servlet request
   * @return user agent or empty string
   */
  public static String userAgent(HttpServletRequest request) {
    return Optional.ofNullable(request.getHeader(HttpHeaders.USER_AGENT)).orElse("");
  }

  private SecretKey jwtSecret() {
    byte[] key = properties.jwtSecret().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    return new SecretKeySpec(key, "HmacSHA256");
  }
}
