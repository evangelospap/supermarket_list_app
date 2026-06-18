package com.supermarket.app.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Runtime settings used by the household backend.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    String frontendDist,
    String legacyStateFile,
    boolean importLegacyState,
    String jwtSecret,
    Duration accessTokenTtl,
    Duration refreshTokenTtl,
    boolean cookieSecure,
    CorsProperties cors) {
  /**
   * CORS settings used by the Vite development server.
   */
  public record CorsProperties(List<String> allowedOrigins) {}
}
