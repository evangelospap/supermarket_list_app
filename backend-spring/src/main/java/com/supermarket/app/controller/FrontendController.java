package com.supermarket.app.controller;

import com.supermarket.app.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Serves the Vite application shell for top-level SPA routes.
 */
@Controller
public class FrontendController {
  private final AppProperties properties;

  FrontendController(AppProperties properties) {
    this.properties = properties;
  }

  @GetMapping(value = {"/", "/auth/callback"}, produces = MediaType.TEXT_HTML_VALUE)
  @ResponseBody
  String index() throws IOException {
    return Files.readString(Path.of(properties.frontendDist()).resolve("index.html"));
  }
}
