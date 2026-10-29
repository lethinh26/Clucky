package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.CategoryDto;
import com.clucky.catalogstoreservice.entity.Category;
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

    public CategoryService(CategoryRepository categoryRepository, CatalogCacheService cacheService) {
        this.categoryRepository = categoryRepository;
        this.cacheService = cacheService;
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
        Category cat = new Category(
                null,
                request.getName(),
                request.getImageUrl(),
                request.getSortOrder() != null ? request.getSortOrder() : 0,
                request.getIsActive() != null ? request.getIsActive() : true
        );
        Category saved = categoryRepository.save(cat);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public CategoryDto.Response updateCategory(Long id, CategoryDto.Request request) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));

        cat.setName(request.getName());
        cat.setImageUrl(request.getImageUrl());
        if (request.getSortOrder() != null) cat.setSortOrder(request.getSortOrder());
        if (request.getIsActive() != null) cat.setIsActive(request.getIsActive());

        Category saved = categoryRepository.save(cat);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public void deleteCategory(Long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));
        categoryRepository.delete(cat);
        cacheService.evictAllStoreMenuCaches();
    }

    private CategoryDto.Response toResponse(Category cat) {
        return new CategoryDto.Response(
                cat.getId(),
                cat.getName(),
                cat.getImageUrl(),
                cat.getSortOrder(),
                cat.getIsActive()
        );
    }
}
