package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.ValidationDto;
import com.clucky.catalogstoreservice.entity.*;
import com.clucky.catalogstoreservice.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ValidationService {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ProductOptionRepository optionRepository;
    private final ProductToppingRepository toppingRepository;
    private final ComboRepository comboRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreInventoryRepository storeInventoryRepository;

    public ValidationService(StoreRepository storeRepository,
                             ProductRepository productRepository,
                             ProductOptionRepository optionRepository,
                             ProductToppingRepository toppingRepository,
                             ComboRepository comboRepository,
                             StoreProductRepository storeProductRepository,
                             StoreInventoryRepository storeInventoryRepository) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.optionRepository = optionRepository;
        this.toppingRepository = toppingRepository;
        this.comboRepository = comboRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
    }

    public ValidationDto.Response validateOrderItems(ValidationDto.Request request) {
        ValidationDto.Response response = new ValidationDto.Response();
        List<ValidationDto.ValidatedItem> resultItems = new ArrayList<>();
        BigDecimal totalSubtotal = BigDecimal.ZERO;
        boolean allValid = true;

        if (request.getStoreId() == null) {
            response.setValid(false);
            response.setMessage("storeId không được để trống!");
            return response;
        }

        Optional<Store> storeOpt = storeRepository.findById(request.getStoreId());
        if (storeOpt.isEmpty()) {
            response.setValid(false);
            response.setStoreOpen(false);
            response.setMessage("Không tìm thấy chi nhánh với mã: " + request.getStoreId());
            return response;
        }

        Store store = storeOpt.get();
        if ("CLOSED_TEMP".equalsIgnoreCase(store.getStatus()) || "INACTIVE".equalsIgnoreCase(store.getStatus())) {
            response.setStoreOpen(false);
            response.setValid(false);
            response.setMessage("Chi nhánh '" + store.getName() + "' hiện đang tạm đóng cửa.");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            response.setValid(false);
            response.setMessage("Danh sách món kiểm tra không được để trống!");
            return response;
        }

        for (ValidationDto.ValidateItemRequest itemReq : request.getItems()) {
            ValidationDto.ValidatedItem itemResult = new ValidationDto.ValidatedItem();
            int qty = itemReq.getQuantity() != null && itemReq.getQuantity() > 0 ? itemReq.getQuantity() : 1;
            itemResult.setQuantity(qty);

            if (itemReq.getProductId() != null) {
                // Validate Product
                itemResult.setProductId(itemReq.getProductId());
                Optional<Product> prodOpt = productRepository.findById(itemReq.getProductId());
                if (prodOpt.isEmpty() || !Boolean.TRUE.equals(prodOpt.get().getIsActive())) {
                    itemResult.setAvailable(false);
                    itemResult.setReason("Món ăn không tồn tại hoặc đã ngừng phục vụ.");
                    allValid = false;
                } else {
                    Product prod = prodOpt.get();
                    itemResult.setName(prod.getName());

                    // Check availability at store
                    Optional<StoreProduct> spOpt = storeProductRepository.findByStoreIdAndProductId(store.getId(), prod.getId());
                    Optional<StoreInventory> siOpt = storeInventoryRepository.findByStoreIdAndProductId(store.getId(), prod.getId());

                    boolean soldOut = spOpt.map(sp -> Boolean.TRUE.equals(sp.getIsSoldOut())).orElse(false)
                            || siOpt.map(si -> si.getQuantityAvailable() < qty).orElse(false);

                    if (soldOut) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Món ăn đã hết hàng tại chi nhánh này.");
                        allValid = false;
                    }

                    BigDecimal unitPrice = spOpt.map(StoreProduct::getStorePrice).filter(p -> p != null).orElse(prod.getBasePrice());
                    itemResult.setUnitPrice(unitPrice);

                    // Calculate extra price from options
                    BigDecimal extras = BigDecimal.ZERO;
                    if (itemReq.getOptionIds() != null) {
                        for (Long optId : itemReq.getOptionIds()) {
                            Optional<ProductOption> opt = optionRepository.findById(optId);
                            if (opt.isPresent() && opt.get().getProduct().getId().equals(prod.getId())) {
                                extras = extras.add(opt.get().getExtraPrice());
                            }
                        }
                    }

                    // Calculate extra price from toppings
                    if (itemReq.getToppingIds() != null) {
                        for (Long topId : itemReq.getToppingIds()) {
                            Optional<ProductTopping> top = toppingRepository.findById(topId);
                            if (top.isPresent() && top.get().getProduct().getId().equals(prod.getId())) {
                                extras = extras.add(top.get().getExtraPrice());
                            }
                        }
                    }

                    itemResult.setExtraPrice(extras);
                    BigDecimal lineTotal = unitPrice.add(extras).multiply(BigDecimal.valueOf(qty));
                    itemResult.setLineTotal(lineTotal);
                    totalSubtotal = totalSubtotal.add(lineTotal);
                }
            } else if (itemReq.getComboId() != null) {
                // Validate Combo
                itemResult.setComboId(itemReq.getComboId());
                Optional<Combo> comboOpt = comboRepository.findByIdWithItems(itemReq.getComboId());
                if (comboOpt.isEmpty() || !Boolean.TRUE.equals(comboOpt.get().getIsActive())) {
                    itemResult.setAvailable(false);
                    itemResult.setReason("Combo không tồn tại hoặc đã hết hạn áp dụng.");
                    allValid = false;
                } else {
                    Combo combo = comboOpt.get();
                    OffsetDateTime now = OffsetDateTime.now();
                    if (combo.getStartAt() != null && now.isBefore(combo.getStartAt())) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Combo chưa đến thời gian áp dụng.");
                        allValid = false;
                    }
                    if (combo.getEndAt() != null && now.isAfter(combo.getEndAt())) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Combo đã hết thời gian áp dụng.");
                        allValid = false;
                    }

                    itemResult.setName(combo.getName());
                    itemResult.setUnitPrice(combo.getComboPrice());
                    itemResult.setExtraPrice(BigDecimal.ZERO);

                    BigDecimal lineTotal = combo.getComboPrice().multiply(BigDecimal.valueOf(qty));
                    itemResult.setLineTotal(lineTotal);
                    totalSubtotal = totalSubtotal.add(lineTotal);
                }
            } else {
                itemResult.setAvailable(false);
                itemResult.setReason("Yêu cầu món thiếu cả productId và comboId.");
                allValid = false;
            }

            resultItems.add(itemResult);
        }

        response.setValid(allValid && response.isStoreOpen());
        response.setSubtotal(totalSubtotal);
        response.setItems(resultItems);
        if (!response.isValid() && response.getMessage() == null) {
            response.setMessage("Một số món trong giỏ hàng không khả dụng tại chi nhánh đã chọn.");
        } else if (response.isValid()) {
            response.setMessage("Toàn bộ món ăn hợp lệ và sẵn sàng phục vụ.");
        }

        return response;
    }
}
