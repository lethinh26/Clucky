package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.CategoryDto;
import com.clucky.catalogstoreservice.entity.Category;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.repository.CategoryRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CatalogCacheService cacheService;
    private final CatalogEvents events;
    private final JdbcTemplate jdbc;

    public CategoryService(CategoryRepository categoryRepository, CatalogCacheService cacheService,
                           CatalogEvents events, JdbcTemplate jdbc) {
        this.categoryRepository = categoryRepository;
        this.cacheService = cacheService;
        this.events = events;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<CategoryDto.Response> getAllCategories(boolean activeOnly) {
        List<Category> list = activeOnly
                ? categoryRepository.findByIsActiveTrueOrderBySortOrderAscIdAsc()
                : categoryRepository.findAllByOrderBySortOrderAscIdAsc();
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryDto.Response getCategoryById(Long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));
        return toResponse(cat);
    }

    public CategoryDto.Response createCategory(CategoryDto.Request request) {
        com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter.requireUnchangedImage(request.getImageUrl(), null, null, null);
        if (request.getExpectedVersion() != null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        lockCategoryOrder();
        List<Category> ordered = new ArrayList<>(categoryRepository.findAllByOrderBySortOrderAscIdAsc());
        Category cat = new Category(
                null,
                request.getName(),
                request.getImageUrl(),
                ordered.size() + 1,
                request.getIsActive() != null ? request.getIsActive() : true
        );
        ordered.add(insertionIndex(request.getSortOrder(), ordered.size()), cat);
        reindex(ordered);
        Category saved = categoryRepository.save(cat);
        categoryRepository.flush();
        events.audit("CATEGORY_CREATED", "Category", saved.getId(), null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public CategoryDto.Response updateCategory(Long id, CategoryDto.Request request) {
        lockCategoryOrder();
        events.expect("categories", id, request.getExpectedVersion());
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));

        com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter.requireUnchangedImage(request.getImageUrl(), null, cat.getImageUrl(), null);
        cat.setName(request.getName());
        if (request.getIsActive() != null) cat.setIsActive(request.getIsActive());

        List<Category> ordered = new ArrayList<>(categoryRepository.findAllByOrderBySortOrderAscIdAsc());
        if (request.getSortOrder() != null && request.getSortOrder() > 0) {
            ordered.removeIf(existing -> existing.getId().equals(id));
            ordered.add(insertionIndex(request.getSortOrder(), ordered.size()), cat);
        }
        reindex(ordered);
        categoryRepository.flush();
        events.audit("CATEGORY_UPDATED", "Category", id, null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(cat);
    }

    public void deleteCategory(Long id, Long expectedVersion) {
        lockCategoryOrder();
        events.expect("categories", id, expectedVersion);
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));
        long productCount = categoryRepository.countProductsByCategoryId(id);
        if (productCount > 0) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        categoryRepository.delete(cat);
        List<Category> remaining = new ArrayList<>(categoryRepository.findAllByOrderBySortOrderAscIdAsc());
        remaining.removeIf(existing -> existing.getId().equals(id));
        reindex(remaining);
        categoryRepository.flush();
        events.audit("CATEGORY_DELETED", "Category", id, null);
        cacheService.evictAllStoreMenuCaches();
    }

    public List<CategoryDto.Response> reorderCategories(CategoryDto.OrderRequest request) {
        lockCategoryOrder();
        List<Category> existing = categoryRepository.findAllByOrderBySortOrderAscIdAsc();
        if (request.items() == null || request.items().size() != existing.size()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        Map<Long, Category> byId = new HashMap<>();
        existing.forEach(cat -> byId.put(cat.getId(), cat));
        Set<Long> seen = new HashSet<>();
        List<Category> ordered = new ArrayList<>(existing.size());
        for (CategoryDto.OrderItem item : request.items()) {
            if (item == null || item.id() == null || item.expectedVersion() == null
                    || !seen.add(item.id())) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR);
            }
            Category cat = byId.get(item.id());
            if (cat == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            if (cat.getVersion() != item.expectedVersion()) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
            ordered.add(cat);
        }

        for (int index = 0; index < ordered.size(); index++) {
            Category cat = ordered.get(index);
            if (cat.getSortOrder() != index + 1) {
                cat.setSortOrder(index + 1);
                events.audit("CATEGORY_REORDERED", "Category", cat.getId(), null);
            }
        }
        categoryRepository.flush();
        cacheService.evictAllStoreMenuCaches();
        return ordered.stream().map(this::toResponse).toList();
    }

    // Serialize all writes to the global ordering, including an insert when the table is empty.
    private void lockCategoryOrder() {
        jdbc.execute("LOCK TABLE catalog_service.categories IN SHARE ROW EXCLUSIVE MODE");
    }

    // The old form sends 0 for a new category; insert it at the end in that case.
    private int insertionIndex(Integer requestedPosition, int size) {
        if (requestedPosition == null || requestedPosition == 0) return size;
        return Math.min(requestedPosition - 1, size);
    }

    private void reindex(List<Category> ordered) {
        for (int index = 0; index < ordered.size(); index++) {
            Category category = ordered.get(index);
            if (!Integer.valueOf(index + 1).equals(category.getSortOrder())) {
                category.setSortOrder(index + 1);
            }
        }
    }

    private CategoryDto.Response toResponse(Category cat) {
        var resp = new CategoryDto.Response(cat.getId(), cat.getName(), cat.getImageUrl(), cat.getSortOrder(), cat.getIsActive());
        resp.setVersion(cat.getVersion());
        return resp;
    }
}
