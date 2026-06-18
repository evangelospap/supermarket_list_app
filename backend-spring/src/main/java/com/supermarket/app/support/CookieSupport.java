package com.supermarket.app.support;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

/**
 * Small servlet cookie helpers used by auth endpoints.
 */
public final class CookieSupport {
  private CookieSupport() {}

  /**
   * Reads a named request cookie.
   *
   * @param request servlet request
   * @param name cookie name
   * @return cookie value when present
   */
  public static Optional<String> readCookie(HttpServletRequest request, String name) {
    if (request.getCookies() == null) {
      return Optional.empty();
    }
    for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
      if (cookie.getName().equals(name)) {
        return Optional.of(cookie.getValue());
      }
    }
    return Optional.empty();
  }
}
