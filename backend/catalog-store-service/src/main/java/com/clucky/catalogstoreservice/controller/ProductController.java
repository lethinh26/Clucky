package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/catalog/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductDto.Response>> listProducts(
            @RequestParam(name = "storeId", required = false) Long storeId,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "spicyLevel", required = false) Integer spicyLevel,
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {

        List<ProductDto.Response> list = productService.getProducts(storeId, categoryId, keyword, spicyLevel, activeOnly);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto.Response> getProduct(
            @PathVariable Long id,
            @RequestParam(name = "storeId", required = false) Long storeId) {
        return ResponseEntity.ok(productService.getProductById(id, storeId));
    }

    @PostMapping
    public ResponseEntity<ProductDto.Response> createProduct(@Valid @RequestBody ProductDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDto.Response> updateProduct(@PathVariable Long id,
                                                             @RequestBody ProductDto.Request request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ProductDto.Response> updateStatus(
            @PathVariable Long id,
            @RequestParam(name = "active", required = false) Boolean activeParam,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        boolean active = true;
        if (activeParam != null) {
            active = activeParam;
        } else if (body != null && body.containsKey("isActive")) {
            active = Boolean.parseBoolean(String.valueOf(body.get("isActive")));
        }
        return ResponseEntity.ok(productService.updateProductStatus(id, active));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ProductDto.Response> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productService.uploadProductImage(id, file));
    }
}
