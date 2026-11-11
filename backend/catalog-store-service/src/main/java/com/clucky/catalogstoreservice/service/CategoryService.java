package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.CategoryDto;
import com.clucky.catalogstoreservice.entity.Category;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CatalogCacheService cacheService;
    private final CatalogEvents events;

    public CategoryService(CategoryRepository categoryRepository, CatalogCacheService cacheService, CatalogEvents events) {
        this.categoryRepository = categoryRepository;
        this.cacheService = cacheService;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<CategoryDto.Response> getAllCategories(boolean activeOnly) {
        List<Category> list = activeOnly
                ? categoryRepository.findByIsActiveTrueOrderBySortOrderAsc()
                : categoryRepository.findAllByOrderBySortOrderAsc();
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
        Category cat = new Category(
                null,
                request.getName(),
                request.getImageUrl(),
                request.getSortOrder() != null ? request.getSortOrder() : 0,
                request.getIsActive() != null ? request.getIsActive() : true
        );
        Category saved = categoryRepository.saveAndFlush(cat);
        events.audit("CATEGORY_CREATED", "Category", saved.getId(), null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public CategoryDto.Response updateCategory(Long id, CategoryDto.Request request) {
        events.expect("categories", id, request.getExpectedVersion());
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));

        com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter.requireUnchangedImage(request.getImageUrl(), null, cat.getImageUrl(), null);
        cat.setName(request.getName());
        if (request.getSortOrder() != null) cat.setSortOrder(request.getSortOrder());
        if (request.getIsActive() != null) cat.setIsActive(request.getIsActive());

        Category saved = categoryRepository.saveAndFlush(cat);
        events.audit("CATEGORY_UPDATED", "Category", id, null);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public void deleteCategory(Long id, Long expectedVersion) {
        events.expect("categories", id, expectedVersion);
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));
        long productCount = categoryRepository.countProductsByCategoryId(id);
        if (productCount > 0) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        categoryRepository.delete(cat);
        categoryRepository.flush();
        events.audit("CATEGORY_DELETED", "Category", id, null);
        cacheService.evictAllStoreMenuCaches();
    }

    private CategoryDto.Response toResponse(Category cat) {
        var resp = new CategoryDto.Response(cat.getId(), cat.getName(), cat.getImageUrl(), cat.getSortOrder(), cat.getIsActive());
        resp.setVersion(cat.getVersion());
        return resp;
    }
}
