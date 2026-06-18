package com.supermarket.app.support;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Helpers for reading authenticated user identity from JWT principals.
 */
public final class SecuritySupport {
  private SecuritySupport() {}

  /**
   * Extracts the authenticated user id from the JWT subject.
   *
   * @param jwt authenticated JWT principal
   * @return user id encoded in the subject
   */
  public static UUID userId(Jwt jwt) {
    if (jwt == null) {
      throw new NotAuthorizedException();
    }
    return UUID.fromString(jwt.getSubject());
  }
}
