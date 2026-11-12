package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.VietQrBankResponse;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
public class VietQrService {
    private static final String BANKS_URL = "https://api.vietqr.io/v2/banks";
    private static final Duration BANK_CACHE_TTL = Duration.ofHours(12);

    private final RestClient restClient;
    private volatile BankCache bankCache;

    public VietQrService(RestClient.Builder restClientBuilder) {
        var factory = new org.springframework.http.client.JdkClientHttpRequestFactory(
                java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = restClientBuilder.requestFactory(factory).build();
    }

    public List<VietQrBankResponse> getBanks() {
        BankCache current = bankCache;
        if (current != null && current.expiresAt().isAfter(Instant.now())) {
            return current.banks();
        }

        synchronized (this) {
            current = bankCache;
            if (current != null && current.expiresAt().isAfter(Instant.now())) {
                return current.banks();
            }

            VietQrBanksResponse response;
            try {
                response = restClient.get()
                        .uri(BANKS_URL)
                        .header("Accept", MediaType.APPLICATION_JSON_VALUE)
                        .retrieve()
                        .body(VietQrBanksResponse.class);
            } catch (RestClientException failure) {
                throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
            }

            if (response == null || !"00".equals(response.code()) || response.data() == null) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }

            List<VietQrBankResponse> banks = response.data().stream()
                    .filter(Objects::nonNull)
                    .filter(bank -> bank.bin() != null && bank.bin().matches("\\d{6}"))
                    .filter(bank -> bank.transferSupported() == null || bank.transferSupported() > 0)
                    .map(bank -> new VietQrBankResponse(bank.bin(), bank.shortName(), bank.name(), bank.logo()))
                    .filter(bank -> !displayName(bank).isBlank())
                    .sorted((left, right) -> displayName(left).compareToIgnoreCase(displayName(right)))
                    .toList();
            if (banks.isEmpty()) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }

            bankCache = new BankCache(banks, Instant.now().plus(BANK_CACHE_TTL));
            return banks;
        }
    }

    private static String displayName(VietQrBankResponse bank) {
        return bank.shortName() != null && !bank.shortName().isBlank() ? bank.shortName() : Objects.toString(bank.name(), "");
    }

    private record BankCache(List<VietQrBankResponse> banks, Instant expiresAt) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VietQrBanksResponse(String code, List<VietQrProviderBank> data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VietQrProviderBank(
            String bin,
            String shortName,
            String name,
            String logo,
            Integer transferSupported
    ) {}
}
