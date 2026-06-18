package com.supermarket.app.support;

import java.security.MessageDigest;
import java.util.Base64;

/**
 * Hashing helper for opaque tokens and invite codes.
 */
public final class Hashing {
  private Hashing() {}

  /**
   * Computes a URL-safe SHA-256 hash.
   *
   * @param value raw secret value
   * @return base64url SHA-256 digest
   */
  public static String sha256(String value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    } catch (Exception exception) {
      throw new IllegalStateException(exception);
    }
  }
}
