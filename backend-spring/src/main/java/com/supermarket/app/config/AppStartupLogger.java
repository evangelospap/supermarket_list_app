package com.supermarket.app.config;

import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.server.context.WebServerInitializedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Logs the browser URLs once the embedded web server has selected its port.
 */
@Component
public class AppStartupLogger {
  private static final Logger log = LoggerFactory.getLogger(AppStartupLogger.class);
  private static final String DEFAULT_TAILSCALE_HOST = "desktop-de1g0tf.tail0276cd.ts.net";
  private final Environment environment;

  AppStartupLogger(Environment environment) {
    this.environment = environment;
  }

  @EventListener
  public void logApplicationUrls(WebServerInitializedEvent event) {
    int port = event.getWebServer().getPort();
    String scheme = environment.getProperty("server.ssl.enabled", Boolean.class, false) ? "https" : "http";
    String certificate = environment.getProperty("app.local-certificate", "none");
    String tailscaleHost = environment.getProperty("TAILSCALE_HOST", DEFAULT_TAILSCALE_HOST);

    log.info("Supermarket app is running at {}://localhost:{}", scheme, port);
    if ("tailscale".equals(certificate)) {
      log.info("Supermarket app is available over Tailscale at {}://{}:{}", scheme, tailscaleHost, port);
    }
    Optional.ofNullable(environment.getProperty("spring.application.name"))
        .ifPresent(name -> log.debug("Started application '{}'", name));
  }
}
