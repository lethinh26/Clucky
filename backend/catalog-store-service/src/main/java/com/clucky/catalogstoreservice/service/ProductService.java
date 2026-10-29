package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.MediaDto;
import com.clucky.catalogstoreservice.dto.ProductDto;
import com.clucky.catalogstoreservice.entity.*;
import com.clucky.catalogstoreservice.exception.ResourceNotFoundException;
import com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter;
import com.clucky.catalogstoreservice.repository.*;
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
    private final StoreRepository storeRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreInventoryRepository storeInventoryRepository;
    private final CloudinaryMediaAdapter mediaAdapter;
    private final CatalogCacheService cacheService;

    public ProductService(ProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          StoreRepository storeRepository,
                          StoreProductRepository storeProductRepository,
                          StoreInventoryRepository storeInventoryRepository,
                          CloudinaryMediaAdapter mediaAdapter,
                          CatalogCacheService cacheService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.storeRepository = storeRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
        this.mediaAdapter = mediaAdapter;
        this.cacheService = cacheService;
    }

    @Transactional(readOnly = true)
    public List<ProductDto.Response> getProducts(Long storeId, Long categoryId, String keyword, Integer spicyLevel, boolean activeOnly) {
        List<Product> products = productRepository.searchProducts(categoryId, keyword, spicyLevel, activeOnly);

        Map<Long, StoreProduct> storeProductMap = new HashMap<>();
        Map<Long, StoreInventory> storeInventoryMap = new HashMap<>();
        if (storeId != null) {
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
                } else if (si != null && si.getQuantityAvailable() <= 0) {
                    resp.setIsSoldOut(true);
                    resp.setIsAvailable(false);
                }
            }
            return resp;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDto.Response getProductById(Long id, Long storeId) {
        Product p = productRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));

        ProductDto.Response resp = toResponse(p);
        if (storeId != null) {
            Optional<StoreProduct> spOpt = storeProductRepository.findByStoreIdAndProductId(storeId, id);
            Optional<StoreInventory> siOpt = storeInventoryRepository.findByStoreIdAndProductId(storeId, id);
            boolean soldOut = spOpt.map(sp -> Boolean.TRUE.equals(sp.getIsSoldOut())).orElse(false)
                    || siOpt.map(si -> si.getQuantityAvailable() <= 0).orElse(false);

            spOpt.ifPresent(sp -> {
                if (sp.getStorePrice() != null) {
                    resp.setBasePrice(sp.getStorePrice());
                    resp.setPrice(sp.getStorePrice());
                }
                resp.setIsAvailable(Boolean.TRUE.equals(sp.getIsAvailable()) && !soldOut);
            });
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
        product.setSpicyLevel(request.getSpicyLevel());
        product.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        applyOptionsAndToppings(product, request.getOptions(), request.getToppings());

        Product saved = productRepository.save(product);

        // Auto initialize store_products and store_inventory across all existing stores
        List<Store> stores = storeRepository.findAll();
        for (Store s : stores) {
            StoreProduct sp = new StoreProduct(null, s, saved, saved.getBasePrice(), true, false);
            storeProductRepository.save(sp);

            StoreInventory si = new StoreInventory(null, s, saved, 50, 10, 1L);
            storeInventoryRepository.save(si);
        }

        cacheService.evictAllStoreMenuCaches();
        return toResponse(saved);
    }

    public ProductDto.Response updateProduct(Long id, ProductDto.Request request) {
        Product product = productRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món ăn với mã: " + id));

        if (!product.getCategory().getId().equals(request.getCategoryId())) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + request.getCategoryId()));
            product.setCategory(category);
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setBasePrice(request.getBasePrice());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getImagePublicId() != null) product.setImagePublicId(request.getImagePublicId());
        if (request.getKcal() != null) product.setKcal(request.getKcal());
        if (request.getSpicyLevel() != null) product.setSpicyLevel(request.getSpicyLevel());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());

        applyOptionsAndToppings(product, request.getOptions(), request.getToppings());

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
            product.getOptions().clear();
            for (ProductDto.OptionGroupDto g : optionsDto) {
                if (g.getChoices() != null) {
                    for (ProductDto.OptionChoiceDto c : g.getChoices()) {
                        ProductOption opt = new ProductOption(null, product, g.getName(), c.getName(), c.getPriceAdjustment());
                        product.getOptions().add(opt);
                    }
                }
            }
        }

        if (toppingsDto != null) {
            product.getToppings().clear();
            for (ProductDto.ToppingDto t : toppingsDto) {
                ProductTopping top = new ProductTopping(null, product, t.getName(), t.getPrice());
                product.getToppings().add(top);
            }
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
        r.setKcal(p.getKcal() != null ? p.getKcal() : 500);
        r.setSpicyLevel(p.getSpicyLevel() != null ? p.getSpicyLevel() : 0);
        r.setIsActive(p.getIsActive());
        r.setIsAvailable(true);
        r.setIsSoldOut(false);
        r.setIsBestSeller(p.getId() <= 3);

        // Group options by groupName
        Map<String, List<ProductDto.OptionChoiceDto>> groupMap = new LinkedHashMap<>();
        if (p.getOptions() != null) {
            for (ProductOption opt : p.getOptions()) {
                groupMap.computeIfAbsent(opt.getGroupName(), k -> new ArrayList<>())
                        .add(new ProductDto.OptionChoiceDto(
                                "opt-" + opt.getId(),
                                opt.getName(),
                                opt.getExtraPrice()
                        ));
            }
        }
        List<ProductDto.OptionGroupDto> optionGroups = new ArrayList<>();
        int gIndex = 1;
        for (Map.Entry<String, List<ProductDto.OptionChoiceDto>> entry : groupMap.entrySet()) {
            optionGroups.add(new ProductDto.OptionGroupDto(
                    "grp-" + (gIndex++),
                    entry.getKey(),
                    true,
                    entry.getValue()
            ));
        }
        r.setOptions(optionGroups);

        // Toppings
        List<ProductDto.ToppingDto> toppings = new ArrayList<>();
        if (p.getToppings() != null) {
            for (ProductTopping top : p.getToppings()) {
                toppings.add(new ProductDto.ToppingDto(
                        "top-" + top.getId(),
                        top.getToppingName(),
                        top.getExtraPrice()
                ));
            }
        }
        r.setToppings(toppings);

        return r;
    }
}
