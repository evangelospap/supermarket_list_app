package com.supermarket.app.controller;

import com.supermarket.app.dto.Dtos.ProductLookupResponse;
import com.supermarket.app.service.BarcodeProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Barcode lookup endpoint used by the product scanner.
 */
@RestController
public class ProductController {
  private final BarcodeProductService products;

  ProductController(BarcodeProductService products) {
    this.products = products;
  }

  @GetMapping("/api/products/{barcode}")
  ResponseEntity<ProductLookupResponse> lookup(@PathVariable String barcode) {
    ProductLookupResponse response = products.lookup(barcode);
    return ResponseEntity.status(response.found() ? HttpStatus.OK : HttpStatus.NOT_FOUND).body(response);
  }
}
