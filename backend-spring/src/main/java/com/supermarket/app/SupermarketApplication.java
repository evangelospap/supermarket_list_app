package com.supermarket.app;

import com.supermarket.app.config.AppProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * Starts the household-aware supermarket backend.
 */
@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class SupermarketApplication {
  /**
   * Runs the Spring Boot application.
   *
   * @param args command-line arguments passed by the runtime
   */
  public static void main(String[] args) {
    SpringApplication application = new SpringApplication(SupermarketApplication.class);
    application.setDefaultProperties(localSslProperties());
    application.run(args);
  }

  private static Map<String, Object> localSslProperties() {
    return localCertificatePairs().stream()
        .filter(pair -> Files.isRegularFile(pair.certificate()) && Files.isRegularFile(pair.privateKey()))
        .findFirst()
        .map(SupermarketApplication::sslProperties)
        .orElseGet(Map::of);
  }

  private static List<CertificatePair> localCertificatePairs() {
    Path certs = Path.of("certs");
    Path parentCerts = Path.of("..", "certs");
    return List.of(
        new CertificatePair("tailscale", certs.resolve("tailscale-dev.pem"), certs.resolve("tailscale-dev-key.pem")),
        new CertificatePair("tailscale", parentCerts.resolve("tailscale-dev.pem"), parentCerts.resolve("tailscale-dev-key.pem")),
        new CertificatePair("local", certs.resolve("local-dev.pem"), certs.resolve("local-dev-key.pem")),
        new CertificatePair("local", parentCerts.resolve("local-dev.pem"), parentCerts.resolve("local-dev-key.pem")));
  }

  private static Map<String, Object> sslProperties(CertificatePair pair) {
    Map<String, Object> properties = new LinkedHashMap<>();
    properties.put("server.ssl.enabled", "true");
    properties.put("server.ssl.bundle", "webserver");
    properties.put("spring.ssl.bundle.pem.webserver.reload-on-update", "true");
    properties.put("spring.ssl.bundle.pem.webserver.keystore.certificate", pair.certificate().toAbsolutePath().normalize().toUri().toString());
    properties.put("spring.ssl.bundle.pem.webserver.keystore.private-key", pair.privateKey().toAbsolutePath().normalize().toUri().toString());
    properties.put("app.local-certificate", pair.name());
    return properties;
  }

  private record CertificatePair(String name, Path certificate, Path privateKey) {}
}
