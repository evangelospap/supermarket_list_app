package com.supermarket.app.service;

import com.supermarket.app.dto.Dtos.ProductLookupResponse;
import com.supermarket.app.dto.Dtos.ProductPayload;
import java.net.URI;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * Looks up barcode products from the global learned table before Open Food Facts.
 */
@Service
public class BarcodeProductService {
  private final JdbcClient jdbc;
  private final RestClient restClient = RestClient.builder()
      .baseUrl("https://world.openfoodfacts.org")
      .defaultHeader(HttpHeaders.USER_AGENT, "supermarket-list-app/0.1")
      .build();

  BarcodeProductService(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Resolves a barcode to a product payload, returning not-found on public catalogue misses. */
  public ProductLookupResponse lookup(String rawBarcode) {
    String barcode = extractCode(rawBarcode);
    if (barcode.isBlank()) {
      return new ProductLookupResponse("", false, null);
    }
    Optional<ProductPayload> learned = jdbc.sql("""
        SELECT barcode, name, brand, quantity, preferred_category, source
        FROM barcode_products
        WHERE barcode = ?
        """).param(barcode).query((rs, rowNum) -> new ProductPayload(
            rs.getString("barcode"),
            rs.getString("name"),
            rs.getString("brand"),
            rs.getString("quantity"),
            rs.getString("preferred_category"),
            rs.getString("source"))).optional();
    if (learned.isPresent()) {
      return new ProductLookupResponse(barcode, true, learned.get());
    }
    return lookupOpenFoodFacts(barcode);
  }

  private ProductLookupResponse lookupOpenFoodFacts(String barcode) {
    try {
      String fields = "abbreviated_product_name,brands,categories,generic_name,generic_name_el,product_name,product_name_el,quantity";
      JsonNode payload = restClient.get()
          .uri(URI.create("/api/v2/product/" + barcode + ".json?fields=" + fields))
          .retrieve()
          .body(JsonNode.class);
      if (payload == null || payload.path("status").asInt() != 1 || payload.path("product").isMissingNode()) {
        return new ProductLookupResponse(barcode, false, null);
      }
      JsonNode product = payload.path("product");
      String name = firstText(product, "product_name_el", "product_name", "generic_name_el", "generic_name", "abbreviated_product_name");
      if (name.isBlank()) {
        return new ProductLookupResponse(barcode, false, null);
      }
      ProductPayload productPayload = new ProductPayload(barcode, name, firstText(product, "brands"), firstText(product, "quantity"), null, "openfoodfacts");
      return new ProductLookupResponse(barcode, true, productPayload);
    } catch (Exception exception) {
      return new ProductLookupResponse(barcode, false, null);
    }
  }

  private String extractCode(String value) {
    String text = Optional.ofNullable(value).orElse("").trim();
    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\b\\d{8,14}\\b").matcher(text);
    return matcher.find() ? matcher.group() : text;
  }

  private String firstText(JsonNode node, String... fields) {
    for (String field : fields) {
      String value = node.path(field).asString("");
      if (!value.isBlank()) {
        return value.trim();
      }
    }
    return "";
  }
}
