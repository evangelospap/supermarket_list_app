package com.supermarket.app.config;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Logs the URLs that can be used to open the supermarket app after startup.
 */
@Component
public class StartupUrlLogger implements ApplicationListener<ApplicationReadyEvent> {
  private static final Logger log = LoggerFactory.getLogger(StartupUrlLogger.class);

  private final WebServerApplicationContext context;
  private final Environment environment;

  /**
   * Creates a startup logger with access to the bound web server and runtime environment.
   *
   * @param context running web server context
   * @param environment resolved application configuration
   */
  public StartupUrlLogger(WebServerApplicationContext context, Environment environment) {
    this.context = context;
    this.environment = environment;
  }

  /**
   * Logs the local and configured public app URLs once the web server is ready.
   *
   * @param event application-ready notification from Spring Boot
   */
  @Override
  public void onApplicationEvent(ApplicationReadyEvent event) {
    List<String> urls = appUrls();
    if (urls.isEmpty()) {
      return;
    }

    log.info("Supermarket app served at {}", String.join(" and ", urls));
  }

  private List<String> appUrls() {
    int port = context.getWebServer().getPort();
    if (port <= 0) {
      return List.of();
    }

    String scheme = environment.getProperty("server.ssl.enabled", Boolean.class, false) ? "https" : "http";
    List<String> urls = new ArrayList<>();
    urls.add(url(scheme, "localhost", port));

    String publicHost = environment.getProperty("app.public-host");
    if (publicHost != null && !publicHost.isBlank() && !"localhost".equalsIgnoreCase(publicHost)) {
      urls.add(url(scheme, publicHost.trim(), port));
    }

    return urls;
  }

  private static String url(String scheme, String host, int port) {
    return "%s://%s:%d".formatted(scheme, host, port);
  }
}
