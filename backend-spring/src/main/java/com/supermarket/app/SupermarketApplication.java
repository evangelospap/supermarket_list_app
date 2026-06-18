package com.supermarket.app;

import com.supermarket.app.config.AppProperties;
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
    SpringApplication.run(SupermarketApplication.class, args);
  }
}
