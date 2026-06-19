package com.supermarket.app;

import com.supermarket.app.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
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
    List<CertificatePair> pairs = new ArrayList<>(List.of(
        new CertificatePair("tailscale", null, certs.resolve("tailscale-dev.pem"), certs.resolve("tailscale-dev-key.pem")),
        new CertificatePair("tailscale", null, parentCerts.resolve("tailscale-dev.pem"), parentCerts.resolve("tailscale-dev-key.pem")),
        new CertificatePair("local", null, certs.resolve("local-dev.pem"), certs.resolve("local-dev-key.pem")),
        new CertificatePair("local", null, parentCerts.resolve("local-dev.pem"), parentCerts.resolve("local-dev-key.pem"))));
    pairs.addAll(hostnamedTailscaleCertificatePairs(certs));
    pairs.addAll(hostnamedTailscaleCertificatePairs(parentCerts));
    return pairs;
  }

  private static List<CertificatePair> hostnamedTailscaleCertificatePairs(Path certs) {
    if (!Files.isDirectory(certs)) {
      return List.of();
    }

    try (Stream<Path> files = Files.list(certs)) {
      return files
          .filter(path -> path.getFileName().toString().endsWith(".ts.net.crt"))
          .map(SupermarketApplication::hostnamedTailscaleCertificatePair)
          .toList();
    } catch (IOException ignored) {
      return List.of();
    }
  }

  private static CertificatePair hostnamedTailscaleCertificatePair(Path certificate) {
    String certificateName = certificate.getFileName().toString();
    String host = certificateName.substring(0, certificateName.length() - ".crt".length());
    Path privateKey = certificate.resolveSibling(host + ".key");
    return new CertificatePair("tailscale", host, certificate, privateKey);
  }

  private static Map<String, Object> sslProperties(CertificatePair pair) {
    Map<String, Object> properties = new LinkedHashMap<>();
    properties.put("server.ssl.enabled", "true");
    properties.put("server.ssl.bundle", "webserver");
    properties.put("spring.ssl.bundle.pem.webserver.reload-on-update", "true");
    properties.put("spring.ssl.bundle.pem.webserver.keystore.certificate", pair.certificate().toAbsolutePath().normalize().toUri().toString());
    properties.put("spring.ssl.bundle.pem.webserver.keystore.private-key", pair.privateKey().toAbsolutePath().normalize().toUri().toString());
    properties.put("app.local-certificate", pair.name());
    if (pair.host() != null) {
      properties.put("app.public-host", pair.host());
    }
    return properties;
  }

  private record CertificatePair(String name, String host, Path certificate, Path privateKey) {}
}
