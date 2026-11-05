package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.MediaDto;
import com.clucky.catalogstoreservice.dto.PageResponse;
import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.entity.*;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter;
import com.clucky.catalogstoreservice.repository.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductOptionRepository optionRepository;
    private final ProductToppingRepository toppingRepository;
    private final ComboItemRepository comboItemRepository;
    private final StoreRepository storeRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreInventoryRepository storeInventoryRepository;
    private final CloudinaryMediaAdapter mediaAdapter;
    private final CatalogCacheService cacheService;

    public ProductService(ProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          ProductOptionRepository optionRepository,
                          ProductToppingRepository toppingRepository,
                          ComboItemRepository comboItemRepository,
                          StoreRepository storeRepository,
                          StoreProductRepository storeProductRepository,
                          StoreInventoryRepository storeInventoryRepository,
                          CloudinaryMediaAdapter mediaAdapter,
                          CatalogCacheService cacheService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.optionRepository = optionRepository;
        this.toppingRepository = toppingRepository;
        this.comboItemRepository = comboItemRepository;
        this.storeRepository = storeRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
        this.mediaAdapter = mediaAdapter;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<ProductDto.Response> getProducts(Long storeId, Long categoryId, String keyword, Integer spicyLevel, boolean activeOnly) {
        List<ProductDto.Response> all = getOrLoadStoreProducts(storeId);
        return filterProducts(all, categoryId, keyword, spicyLevel, activeOnly);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductDto.Response> getProductsPaged(Long storeId, Long categoryId, String keyword, Integer spicyLevel, boolean activeOnly, Pageable pageable) {
        List<ProductDto.Response> all = getOrLoadStoreProducts(storeId);
        List<ProductDto.Response> filtered = filterProducts(all, categoryId, keyword, spicyLevel, activeOnly);

        int totalElements = filtered.size();
        int pageSize = pageable.getPageSize();
        int pageNumber = pageable.getPageNumber();
        int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalElements / pageSize) : 0;

        int fromIndex = Math.min(pageNumber * pageSize, totalElements);
        int toIndex = Math.min(fromIndex + pageSize, totalElements);
        List<ProductDto.Response> content = filtered.subList(fromIndex, toIndex);

        return new PageResponse<>(content, pageNumber, pageSize, totalElements, totalPages);
    }

    private List<ProductDto.Response> getOrLoadStoreProducts(Long storeId) {
        List<ProductDto.Response> cached = cacheService.getCachedMenu(storeId);
        if (cached != null) {
            return cached;
        }

        List<ProductDto.Response> loaded = loadFullProductsFromDb(storeId);
        cacheService.setCachedMenu(storeId, loaded);
        return loaded;
    }

    private List<ProductDto.Response> loadFullProductsFromDb(Long storeId) {
        List<Product> products = productRepository.findAllWithCategory();

        Map<Long, StoreProduct> storeProductMap = new HashMap<>();
        Map<Long, StoreInventory> storeInventoryMap = new HashMap<>();
        if (storeId != null) {
            storeRepository.findById(storeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + storeId));
            List<StoreProduct> spList = storeProductRepository.findByStoreId(storeId);
            for (StoreProduct sp : spList) {
                storeProductMap.put(sp.getProduct().getId(), sp);
            }
            List<StoreInventory> siList = storeInventoryRepository.findByStoreId(storeId);
            for (StoreInventory si : siList) {
                storeInventoryMap.put(si.getProduct().getId(), si);
            }
        }

        return products.stream().map(p -> {
            ProductDto.Response resp = toResponse(p);
            if (storeId != null) {
                StoreProduct sp = storeProductMap.get(p.getId());
                StoreInventory si = storeInventoryMap.get(p.getId());
                if (sp != null) {
                    if (sp.getStorePrice() != null) {
                        resp.setBasePrice(sp.getStorePrice());
                        resp.setPrice(sp.getStorePrice());
                    }
                    boolean soldOut = Boolean.TRUE.equals(sp.getIsSoldOut()) || (si != null && si.getQuantityAvailable() <= 0);
                    resp.setIsSoldOut(soldOut);
                    resp.setIsAvailable(Boolean.TRUE.equals(sp.getIsAvailable()) && !soldOut);
                } else {
                    resp.setIsSoldOut(true);
                    resp.setIsAvailable(false);
                }
            }
            return resp;
        }).collect(Collectors.toList());
    }

    private List<ProductDto.Response> filterProducts(List<ProductDto.Response> list,
                                                     Long categoryId,
                                                     String keyword,
                                                     Integer spicyLevel,
                                                     boolean activeOnly) {
        String trimmed = keyword != null && !keyword.trim().isEmpty() ? keyword.trim().toLowerCase() : null;
        return list.stream().filter(p -> {
            if (activeOnly && !Boolean.TRUE.equals(p.getIsActive())) {
                return false;
            }
            if (categoryId != null && !categoryId.equals(p.getCategoryId())) {
                return false;
            }
            if (spicyLevel != null && !spicyLevel.equals(p.getSpicyLevel())) {
                return false;
            }
            if (trimmed != null) {
                boolean nameMatch = p.getName() != null && p.getName().toLowerCase().contains(trimmed);
                boolean descMatch = p.getDescription() != null && p.getDescription().toLowerCase().contains(trimmed);
                if (!nameMatch && !descMatch) {
                    return false;
                }
            }
            return true;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDto.Response getProductById(Long id, Long storeId) {
        Product p = productRepository.findByIdWithCategory(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));

        ProductDto.Response resp = toResponse(p);
        if (storeId != null) {
            storeRepository.findById(storeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với mã: " + storeId));
            Optional<StoreProduct> spOpt = storeProductRepository.findByStoreIdAndProductId(storeId, id);
            Optional<StoreInventory> siOpt = storeInventoryRepository.findByStoreIdAndProductId(storeId, id);
            boolean soldOut = spOpt.isEmpty() || siOpt.isEmpty()
                    || spOpt.map(sp -> Boolean.TRUE.equals(sp.getIsSoldOut())).orElse(false)
                    || siOpt.map(si -> si.getQuantityAvailable() <= 0).orElse(false);

            spOpt.ifPresent(sp -> {
                if (sp.getStorePrice() != null) {
                    resp.setBasePrice(sp.getStorePrice());
                    resp.setPrice(sp.getStorePrice());
                }
                resp.setIsAvailable(Boolean.TRUE.equals(sp.getIsAvailable()) && !soldOut);
            });
            if (spOpt.isEmpty()) {
                resp.setIsAvailable(false);
            }
            resp.setIsSoldOut(soldOut);
        }
        return resp;
    }

    public ProductDto.Response createProduct(ProductDto.Request request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + request.getCategoryId()));

        Product product = new Product();
        product.setCategory(category);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setBasePrice(request.getBasePrice());
        product.setImageUrl(request.getImageUrl());
        product.setImagePublicId(request.getImagePublicId());
        product.setKcal(request.getKcal());
        product.setSpicyLevel(request.getSpicyLevel() != null ? request.getSpicyLevel() : 0);
        product.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        applyOptionsAndToppings(product, request.getOptions(), request.getToppings());

        Product saved = productRepository.save(product);

        // Auto initialize store_products and store_inventory across all existing stores
        List<Store> stores = storeRepository.findAll();
        for (Store s : stores) {
            StoreProduct sp = new StoreProduct(null, s, saved, null, true, false);
            storeProductRepository.save(sp);

            StoreInventory si = new StoreInventory(null, s, saved, 0, 10, null);
            storeInventoryRepository.save(si);
        }

        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ProductDto.Response updateProduct(Long id, ProductDto.Request request) {
        Product product = productRepository.findByIdWithCategory(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + request.getCategoryId()));
            product.setCategory(category);
        }

        if (request.getName() != null && !request.getName().isBlank()) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getBasePrice() != null) product.setBasePrice(request.getBasePrice());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getImagePublicId() != null) product.setImagePublicId(request.getImagePublicId());
        if (request.getKcal() != null) product.setKcal(request.getKcal());
        if (request.getSpicyLevel() != null) product.setSpicyLevel(request.getSpicyLevel());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());

        if (request.getOptions() != null || request.getToppings() != null) {
            applyOptionsAndToppings(product, request.getOptions(), request.getToppings());
        }

        Product saved = productRepository.save(product);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ProductDto.Response updateProductStatus(Long id, boolean isActive) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));
        product.setIsActive(isActive);
        Product saved = productRepository.save(product);
        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));

        String oldPublicId = product.getImagePublicId();
        storeInventoryRepository.deleteByProductId(id);
        storeProductRepository.deleteByProductId(id);
        productRepository.delete(product);

        if (oldPublicId != null && !oldPublicId.isBlank()) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }
        cacheService.evictAllStoreMenuCaches();
    }

    public ProductDto.Response uploadProductImage(Long id, MultipartFile file) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));

        String oldPublicId = product.getImagePublicId();
        MediaDto.UploadResponse uploadRes = mediaAdapter.uploadImage(file, "products");

        product.setImageUrl(uploadRes.getSecureUrl());
        product.setImagePublicId(uploadRes.getPublicId());
        Product saved = productRepository.save(product);

        if (oldPublicId != null && !oldPublicId.isBlank() && !oldPublicId.equals(uploadRes.getPublicId())) {
            mediaAdapter.deleteOldAssetAfterCommit(oldPublicId);
        }

        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    private void applyOptionsAndToppings(Product product,
                                         List<ProductDto.OptionGroupDto> optionsDto,
                                         List<ProductDto.ToppingDto> toppingsDto) {
        if (optionsDto != null) {
            Map<Long, ProductOption> remainingOptions = product.getOptions().stream()
                    .collect(Collectors.toMap(ProductOption::getId, option -> option));
            List<ProductOption> retainedOptions = new ArrayList<>();
            for (ProductDto.OptionGroupDto group : optionsDto) {
                if (group.getChoices() != null) {
                    for (ProductDto.OptionChoiceDto choice : group.getChoices()) {
                        Long optionId = persistedItemId(choice.getId(), "opt-");
                        ProductOption option = optionId == null
                                ? new ProductOption(null, product, group.getName(), choice.getName(), choice.getPriceAdjustment(), group.isRequired())
                                : remainingOptions.remove(optionId);
                        if (option == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
                        option.setGroupName(group.getName());
                        option.setName(choice.getName());
                        option.setExtraPrice(choice.getPriceAdjustment());
                        option.setIsRequired(group.isRequired());
                        retainedOptions.add(option);
                    }
                }
            }
            if (!remainingOptions.isEmpty()
                    && comboItemRepository.existsByOptionIdIn(new ArrayList<>(remainingOptions.keySet()))) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
            product.getOptions().removeIf(option -> !retainedOptions.contains(option));
            for (ProductOption option : retainedOptions) {
                if (!product.getOptions().contains(option)) product.getOptions().add(option);
            }
        }

        if (toppingsDto != null) {
            Map<Long, ProductTopping> remainingToppings = product.getToppings().stream()
                    .collect(Collectors.toMap(ProductTopping::getId, topping -> topping));
            List<ProductTopping> retainedToppings = new ArrayList<>();
            for (ProductDto.ToppingDto toppingDto : toppingsDto) {
                Long toppingId = persistedItemId(toppingDto.getId(), "top-");
                ProductTopping topping = toppingId == null
                        ? new ProductTopping(null, product, toppingDto.getName(), toppingDto.getPrice())
                        : remainingToppings.remove(toppingId);
                if (topping == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
                topping.setToppingName(toppingDto.getName());
                topping.setExtraPrice(toppingDto.getPrice());
                retainedToppings.add(topping);
            }
            product.getToppings().removeIf(topping -> !retainedToppings.contains(topping));
            for (ProductTopping topping : retainedToppings) {
                if (!product.getToppings().contains(topping)) product.getToppings().add(topping);
            }
        }
    }

    private Long persistedItemId(String value, String prefix) {
        if (value == null || value.startsWith("new-")) return null;
        if (!value.startsWith(prefix)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        try {
            long itemId = Long.parseLong(value.substring(prefix.length()));
            if (itemId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
            return itemId;
        } catch (NumberFormatException failure) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    public ProductDto.Response toResponse(Product p) {
        ProductDto.Response r = new ProductDto.Response();
        r.setId(p.getId());
        r.setSlug(ProductDto.toSlug(p.getName()) + "-" + p.getId());
        r.setName(p.getName());
        if (p.getCategory() != null) {
            r.setCategoryId(p.getCategory().getId());
            r.setCategoryName(p.getCategory().getName());
        }
        r.setDescription(p.getDescription());
        r.setBasePrice(p.getBasePrice());
        r.setImageUrl(p.getImageUrl());
        r.setImagePublicId(p.getImagePublicId());
        r.setAlt(p.getName() + " - Clucky");
        r.setKcal(p.getKcal());
        r.setSpicyLevel(p.getSpicyLevel());
        r.setIsActive(p.getIsActive());

        // Group options by groupName
        Map<String, List<ProductOption>> rawGroupMap = new LinkedHashMap<>();
        List<ProductOption> options = optionRepository.findByProductId(p.getId());
        for (ProductOption opt : options) {
            rawGroupMap.computeIfAbsent(opt.getGroupName(), k -> new ArrayList<>()).add(opt);
        }
        List<ProductDto.OptionGroupDto> optionGroups = new ArrayList<>();
        int gIndex = 1;
        for (Map.Entry<String, List<ProductOption>> entry : rawGroupMap.entrySet()) {
            boolean isRequired = entry.getValue().stream()
                    .anyMatch(opt -> opt.getIsRequired() == null || Boolean.TRUE.equals(opt.getIsRequired()));
            List<ProductDto.OptionChoiceDto> choices = entry.getValue().stream()
                    .map(opt -> new ProductDto.OptionChoiceDto(
                            "opt-" + opt.getId(),
                            opt.getName(),
                            opt.getExtraPrice()
                    )).collect(Collectors.toList());
            optionGroups.add(new ProductDto.OptionGroupDto(
                    "grp-" + (gIndex++),
                    entry.getKey(),
                    isRequired,
                    choices
            ));
        }
        r.setOptions(optionGroups);

        // Toppings
        List<ProductDto.ToppingDto> toppings = new ArrayList<>();
        List<ProductTopping> toppingsList = toppingRepository.findByProductId(p.getId());
        for (ProductTopping top : toppingsList) {
            toppings.add(new ProductDto.ToppingDto(
                    "top-" + top.getId(),
                    top.getToppingName(),
                    top.getExtraPrice()
            ));
        }
        r.setToppings(toppings);

        return r;
    }
}
