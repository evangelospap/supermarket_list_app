package com.supermarket.app.controller;

import com.supermarket.app.support.NotAuthorizedException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

/**
 * Converts application exceptions to small JSON API errors.
 */
@ControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(NotAuthorizedException.class)
  ResponseEntity<Map<String, Object>> unauthorized() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> serverError(Exception exception) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", exception.getMessage()));
  }
}
