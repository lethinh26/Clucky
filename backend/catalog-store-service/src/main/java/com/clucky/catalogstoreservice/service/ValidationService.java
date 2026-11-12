package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.dto.ValidationDto;
import com.clucky.catalogstoreservice.entity.*;
import com.clucky.catalogstoreservice.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ValidationService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ProductOptionRepository optionRepository;
    private final ProductToppingRepository toppingRepository;
    private final ComboRepository comboRepository;
    private final StoreProductRepository storeProductRepository;
    private final StoreInventoryRepository storeInventoryRepository;
    private final StoreService storeService;

    public ValidationService(StoreRepository storeRepository,
                             ProductRepository productRepository,
                             ProductOptionRepository optionRepository,
                             ProductToppingRepository toppingRepository,
                             ComboRepository comboRepository,
                             StoreProductRepository storeProductRepository,
                             StoreInventoryRepository storeInventoryRepository,
                             StoreService storeService) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.optionRepository = optionRepository;
        this.toppingRepository = toppingRepository;
        this.comboRepository = comboRepository;
        this.storeProductRepository = storeProductRepository;
        this.storeInventoryRepository = storeInventoryRepository;
        this.storeService = storeService;
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
        if (!storeService.isStoreServingNow(store)) {
            response.setStoreOpen(false);
            response.setValid(false);
            String message;
            if (store.getStatus() == StoreStatus.INACTIVE) {
                message = "Chi nhánh '" + store.getName() + "' hiện đã ngừng kinh doanh.";
            } else if (store.getStatus() == StoreStatus.CLOSED_TEMP) {
                message = "Chi nhánh '" + store.getName() + "' hiện đang tạm đóng cửa.";
            } else {
                String openStr = store.getOpenTime() != null ? store.getOpenTime().format(TIME_FORMAT) : "";
                String closeStr = store.getCloseTime() != null ? store.getCloseTime().format(TIME_FORMAT) : "";
                message = "Chi nhánh '" + store.getName() + "' hiện đang ngoài giờ phục vụ (Giờ mở cửa: " + openStr + " - " + closeStr + "). Vui lòng quay lại trong giờ hoạt động.";
            }
            response.setMessage(message);
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            response.setValid(false);
            response.setMessage("Danh sách món kiểm tra không được để trống!");
            return response;
        }

        // Aggregate total demanded quantities per product across standalone items and combos
        Map<Long, Long> totalDemandedQuantity = new HashMap<>();
        Map<Long, Combo> comboCache = new HashMap<>();

        for (ValidationDto.ValidateItemRequest itemReq : request.getItems()) {
            int qty = itemReq.getQuantity() != null && itemReq.getQuantity() > 0 ? itemReq.getQuantity() : 1;
            if (itemReq.getProductId() != null) {
                totalDemandedQuantity.merge(itemReq.getProductId(), (long) qty, (current, added) -> current > Long.MAX_VALUE - added ? Long.MAX_VALUE : current + added);
            } else if (itemReq.getComboId() != null) {
                Combo combo = comboCache.computeIfAbsent(itemReq.getComboId(), id ->
                        comboRepository.findByIdWithItems(id).orElse(null)
                );
                if (combo != null && combo.getItems() != null) {
                    for (ComboItem ci : combo.getItems()) {
                        if (ci.getProduct() != null && ci.getProduct().getId() != null) {
                            long compQty = (long) (ci.getQuantity() != null && ci.getQuantity() > 0 ? ci.getQuantity() : 1) * qty;
                            totalDemandedQuantity.merge(ci.getProduct().getId(), compQty, (current, added) -> current > Long.MAX_VALUE - added ? Long.MAX_VALUE : current + added);
                        }
                    }
                }
            }
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

                    // Check availability & inventory strictly at store
                    Optional<StoreProduct> spOpt = storeProductRepository.findByStoreIdAndProductId(store.getId(), prod.getId());
                    Optional<StoreInventory> siOpt = storeInventoryRepository.findByStoreIdAndProductId(store.getId(), prod.getId());

                    if (spOpt.isEmpty()) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Món ăn không khả dụng tại chi nhánh này.");
                        allValid = false;
                    } else if (!Boolean.TRUE.equals(spOpt.get().getIsAvailable())) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Món ăn hiện không được bán tại chi nhánh này.");
                        allValid = false;
                    } else if (Boolean.TRUE.equals(spOpt.get().getIsSoldOut())) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Món ăn đã hết hàng tại chi nhánh này.");
                        allValid = false;
                    } else if (siOpt.isEmpty()) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Món ăn không có dữ liệu tồn kho tại chi nhánh này.");
                        allValid = false;
                    } else {
                        int availableStock = siOpt.get().getQuantityAvailable() != null ? siOpt.get().getQuantityAvailable() : 0;
                        long requiredStock = totalDemandedQuantity.getOrDefault(prod.getId(), (long) qty);
                        if (availableStock < requiredStock) {
                            itemResult.setAvailable(false);
                            itemResult.setReason("Món ăn không đủ số lượng tồn kho tại chi nhánh.");
                            allValid = false;
                        }
                    }

                    BigDecimal unitPrice = spOpt.map(StoreProduct::getStorePrice).filter(Objects::nonNull).orElse(prod.getBasePrice());
                    itemResult.setUnitPrice(unitPrice);

                    // Validate required option groups and reject invalid/foreign option IDs
                    List<ProductOption> productOptions = optionRepository.findByProductId(prod.getId());
                    Map<String, List<ProductOption>> groupMap = productOptions.stream()
                            .collect(Collectors.groupingBy(ProductOption::getGroupName, LinkedHashMap::new, Collectors.toList()));
                    Map<Long, ProductOption> validOptionMap = productOptions.stream()
                            .collect(Collectors.toMap(ProductOption::getId, o -> o));

                    BigDecimal optionExtras = BigDecimal.ZERO;
                    boolean optionsValid = true;
                    Set<String> chosenGroups = new HashSet<>();
                    List<Long> requestedOptionIds = itemReq.getOptionIds() != null ? itemReq.getOptionIds() : Collections.emptyList();

                    for (Long optId : requestedOptionIds) {
                        ProductOption opt = validOptionMap.get(optId);
                        if (opt == null) {
                            itemResult.setAvailable(false);
                            itemResult.setReason("Tùy chọn (optionId=" + optId + ") không hợp lệ hoặc không thuộc món ăn này.");
                            allValid = false;
                            optionsValid = false;
                            break;
                        }
                        if (!chosenGroups.add(opt.getGroupName())) {
                            itemResult.setAvailable(false);
                            itemResult.setReason("Không thể chọn nhiều hơn 1 tùy chọn cho nhóm '" + opt.getGroupName() + "'.");
                            allValid = false;
                            optionsValid = false;
                            break;
                        }
                        optionExtras = optionExtras.add(opt.getExtraPrice());
                        itemResult.getOptionsSnapshot().add(new ValidationDto.OptionSnapshot(
                                opt.getId(), opt.getGroupName(), opt.getName(), opt.getExtraPrice()));
                    }

                    if (optionsValid) {
                        for (Map.Entry<String, List<ProductOption>> entry : groupMap.entrySet()) {
                            String groupName = entry.getKey();
                            boolean isRequired = entry.getValue().stream()
                                    .anyMatch(opt -> opt.getIsRequired() == null || Boolean.TRUE.equals(opt.getIsRequired()));
                            if (isRequired && !chosenGroups.contains(groupName)) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Thiếu tùy chọn bắt buộc cho nhóm '" + groupName + "'.");
                                allValid = false;
                                optionsValid = false;
                                break;
                            }
                        }
                    }

                    // Validate toppings and reject invalid/foreign topping IDs
                    BigDecimal toppingExtras = BigDecimal.ZERO;
                    boolean toppingsValid = true;
                    List<ProductTopping> productToppings = toppingRepository.findByProductId(prod.getId());
                    Map<Long, ProductTopping> validToppingMap = productToppings.stream()
                            .collect(Collectors.toMap(ProductTopping::getId, t -> t));
                    List<Long> requestedToppingIds = itemReq.getToppingIds() != null ? itemReq.getToppingIds() : Collections.emptyList();

                    for (Long topId : requestedToppingIds) {
                        ProductTopping top = validToppingMap.get(topId);
                        if (top == null) {
                            itemResult.setAvailable(false);
                            itemResult.setReason("Topping (toppingId=" + topId + ") không hợp lệ hoặc không thuộc món ăn này.");
                            allValid = false;
                            toppingsValid = false;
                            break;
                        }
                        toppingExtras = toppingExtras.add(top.getExtraPrice());
                        itemResult.getToppingsSnapshot().add(new ValidationDto.ToppingSnapshot(
                                top.getId(), top.getToppingName(), top.getExtraPrice()));
                    }

                    if (optionsValid && toppingsValid && itemResult.isAvailable()) {
                        BigDecimal extras = optionExtras.add(toppingExtras);
                        itemResult.setExtraPrice(extras);
                        BigDecimal lineTotal = unitPrice.add(extras).multiply(BigDecimal.valueOf(qty));
                        itemResult.setLineTotal(lineTotal);
                        totalSubtotal = totalSubtotal.add(lineTotal);
                    } else {
                        itemResult.setExtraPrice(BigDecimal.ZERO);
                        itemResult.setLineTotal(BigDecimal.ZERO);
                    }
                }
            } else if (itemReq.getComboId() != null) {
                // Validate Combo
                itemResult.setComboId(itemReq.getComboId());
                Combo combo = comboCache.computeIfAbsent(itemReq.getComboId(), id ->
                        comboRepository.findByIdWithItems(id).orElse(null)
                );

                if (combo == null || !Boolean.TRUE.equals(combo.getIsActive())) {
                    itemResult.setAvailable(false);
                    itemResult.setReason("Combo không tồn tại hoặc đã ngừng áp dụng.");
                    allValid = false;
                } else {
                    OffsetDateTime now = OffsetDateTime.now();
                    if (combo.getStartAt() != null && now.isBefore(combo.getStartAt())) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Combo chưa đến thời gian áp dụng.");
                        allValid = false;
                    } else if (combo.getEndAt() != null && now.isAfter(combo.getEndAt())) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Combo đã hết thời gian áp dụng.");
                        allValid = false;
                    } else if (combo.getItems() == null || combo.getItems().isEmpty()) {
                        itemResult.setAvailable(false);
                        itemResult.setReason("Combo chưa có món thành phần.");
                        allValid = false;
                    } else {
                        // Check availability and stock for each combo component
                        for (ComboItem ci : combo.getItems()) {
                            Product cp = ci.getProduct();
                            if (cp == null || !Boolean.TRUE.equals(cp.getIsActive())) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Món '" + (cp != null ? cp.getName() : "thành phần") + "' trong combo đã ngừng phục vụ.");
                                allValid = false;
                                break;
                            }

                            Optional<StoreProduct> spOpt = storeProductRepository.findByStoreIdAndProductId(store.getId(), cp.getId());
                            Optional<StoreInventory> siOpt = storeInventoryRepository.findByStoreIdAndProductId(store.getId(), cp.getId());

                            if (spOpt.isEmpty()) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Món '" + cp.getName() + "' trong combo không khả dụng tại chi nhánh này.");
                                allValid = false;
                                break;
                            }
                            if (!Boolean.TRUE.equals(spOpt.get().getIsAvailable())) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Món '" + cp.getName() + "' trong combo không được bán tại chi nhánh này.");
                                allValid = false;
                                break;
                            }
                            if (Boolean.TRUE.equals(spOpt.get().getIsSoldOut())) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Món '" + cp.getName() + "' trong combo đã hết hàng tại chi nhánh này.");
                                allValid = false;
                                break;
                            }
                            if (siOpt.isEmpty()) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Món '" + cp.getName() + "' trong combo không có dữ liệu tồn kho tại chi nhánh này.");
                                allValid = false;
                                break;
                            }
                            int availableStock = siOpt.get().getQuantityAvailable() != null ? siOpt.get().getQuantityAvailable() : 0;
                            long requiredStock = totalDemandedQuantity.getOrDefault(cp.getId(), 0L);
                            if (availableStock < requiredStock) {
                                itemResult.setAvailable(false);
                                itemResult.setReason("Món '" + cp.getName() + "' trong combo không đủ tồn kho tại chi nhánh.");
                                allValid = false;
                                break;
                            }
                        }
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
            String firstReason = resultItems.stream()
                    .filter(it -> !it.isAvailable() && it.getReason() != null && !it.getReason().isBlank())
                    .map(it -> (it.getName() != null ? "[" + it.getName() + "] " : "") + it.getReason())
                    .findFirst()
                    .orElse(null);
            response.setMessage(firstReason != null
                    ? firstReason
                    : "Một số món trong giỏ hàng không khả dụng tại chi nhánh đã chọn.");
        } else if (response.isValid()) {
            response.setMessage("Toàn bộ món ăn hợp lệ và sẵn sàng phục vụ.");
        }

        return response;
    }
}
