package com.supermarket.app.support;

import java.util.Optional;

/**
 * Derives readable guest device labels from user-agent strings.
 */
public final class DeviceNames {
  private DeviceNames() {}

  /**
   * Maps a user-agent string to a compact display label.
   *
   * @param userAgent request user-agent
   * @return a readable device/browser label
   */
  public static String fromUserAgent(String userAgent) {
    String value = Optional.ofNullable(userAgent).orElse("").toLowerCase();
    if (value.contains("iphone")) {
      return "iPhone";
    }
    if (value.contains("android")) {
      return "Android";
    }
    if (value.contains("safari") && !value.contains("chrome")) {
      return "Safari";
    }
    if (value.contains("chrome")) {
      return "Chrome";
    }
    return "Device";
  }
}
