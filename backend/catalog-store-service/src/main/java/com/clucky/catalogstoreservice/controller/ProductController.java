package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.dto.PageResponse;
import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<?> listProducts(
            @RequestParam(name = "storeId", required = false) Long storeId,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "spicyLevel", required = false) Integer spicyLevel,
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {

        if (page != null || size != null) {
            int pageNum = page != null ? Math.max(0, page) : 0;
            int pageSize = size != null ? Math.max(1, size) : 20;
            PageResponse<ProductDto.Response> pageResponse = productService.getProductsPaged(
                    storeId, categoryId, keyword, spicyLevel, activeOnly, PageRequest.of(pageNum, pageSize));
            return ResponseEntity.ok()
                    .cacheControl(activeOnly ? CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic() : CacheControl.noStore())
                    .body(pageResponse);
        }

        List<ProductDto.Response> list = productService.getProducts(storeId, categoryId, keyword, spicyLevel, activeOnly);
        return ResponseEntity.ok()
                .cacheControl(activeOnly ? CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic() : CacheControl.noStore())
                .body(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto.Response> getProduct(
            @PathVariable Long id,
            @RequestParam(name = "storeId", required = false) Long storeId) {
        return ResponseEntity.ok(productService.getProductById(id, storeId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto.Response> createProduct(@Valid @RequestBody ProductDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto.Response> updateProduct(@PathVariable Long id,
                                                             @Valid @RequestBody ProductDto.Request request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto.Response> updateStatus(
            @PathVariable Long id,
            @RequestParam Long expectedVersion,
            @RequestParam(name = "active", required = false) Boolean activeParam,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        boolean active;
        if (activeParam != null) {
            active = activeParam;
        } else if (body != null && body.get("isActive") instanceof Boolean value) {
            active = value;
        } else {
            throw new com.clucky.catalogstoreservice.exception.ApiException(com.clucky.catalogstoreservice.exception.ErrorCode.VALIDATION_ERROR);
        }
        return ResponseEntity.ok(productService.updateProductStatus(id, active, expectedVersion));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id, @RequestParam Long expectedVersion) {
        productService.deleteProduct(id, expectedVersion);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto.Response> uploadImage(
            @PathVariable Long id,
            @RequestParam Long expectedVersion,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productService.uploadProductImage(id, file, expectedVersion));
    }
}
