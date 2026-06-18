package com.supermarket.app.config;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configures static Vite asset serving and local development CORS.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final AppProperties properties;

  WebConfig(AppProperties properties) {
    this.properties = properties;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path dist = Path.of(properties.frontendDist()).toAbsolutePath().normalize();
    registry.addResourceHandler("/assets/**").addResourceLocations(resourceDirectory(dist.resolve("assets")));
    registry.addResourceHandler("/*.js", "/*.css", "/*.ico", "/*.png", "/*.svg").addResourceLocations(resourceDirectory(dist));
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    List<String> origins = Optional.ofNullable(properties.cors())
        .map(AppProperties.CorsProperties::allowedOrigins)
        .orElse(List.of());
    registry.addMapping("/api/**").allowedOrigins(origins.toArray(String[]::new)).allowedMethods("*").allowCredentials(true);
  }

  private static String resourceDirectory(Path path) {
    String location = path.toUri().toString();
    return location.endsWith("/") ? location : location + "/";
  }
}
