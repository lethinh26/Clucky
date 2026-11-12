package com.clucky.paymentservice.service;

import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpResponse;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class VietQrServiceTest {

    private static final String SAMPLE_JSON = """
            {
              "code": "00",
              "desc": "success",
              "data": [
                {
                  "bin": "970436",
                  "shortName": "Vietcombank",
                  "name": "Ngan hang Ngoai thuong Viet Nam",
                  "logo": "https://api.vietqr.io/img/VCB.png",
                  "transferSupported": 1
                },
                {
                  "bin": "970405",
                  "shortName": "Agribank",
                  "name": "Ngan hang Nong nghiep va Phat trien Nong thon",
                  "logo": "https://api.vietqr.io/img/VBA.png",
                  "transferSupported": 1
                },
                {
                  "bin": "12345",
                  "shortName": "InvalidBinBank",
                  "name": "Invalid Bin",
                  "logo": null,
                  "transferSupported": 1
                },
                {
                  "bin": "970499",
                  "shortName": "NoTransferBank",
                  "name": "No Fast Transfer",
                  "logo": null,
                  "transferSupported": 0
                }
              ]
            }
            """;

    @Test
    void getBanksFiltersInvalidBinsAndUnsupportedTransfersAndSorts() {
        var client = RestClient.builder().requestInterceptor((request, body, execution) -> {
            var response = new MockClientHttpResponse(SAMPLE_JSON.getBytes(StandardCharsets.UTF_8), HttpStatus.OK);
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            return response;
        }).build();

        var service = new VietQrService(client, "https://api.vietqr.io/v2/banks");
        var banks = service.getBanks();

        assertEquals(2, banks.size());
        assertEquals("970405", banks.get(0).bin());
        assertEquals("Agribank", banks.get(0).shortName());
        assertEquals("970436", banks.get(1).bin());
        assertEquals("Vietcombank", banks.get(1).shortName());
    }

    @Test
    void getBanksCachesResultsInSubsequentCalls() {
        var callCount = new AtomicInteger();
        var client = RestClient.builder().requestInterceptor((request, body, execution) -> {
            callCount.incrementAndGet();
            var response = new MockClientHttpResponse(SAMPLE_JSON.getBytes(StandardCharsets.UTF_8), HttpStatus.OK);
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            return response;
        }).build();

        var service = new VietQrService(client, "https://api.vietqr.io/v2/banks");
        var first = service.getBanks();
        var second = service.getBanks();

        assertEquals(1, callCount.get());
        assertSame(first, second);
    }

    @Test
    void getBanksThrowsDependencyUnavailableWhenUpstreamFailsWithNoCache() {
        var client = RestClient.builder().requestInterceptor((request, body, execution) -> {
            throw new ResourceAccessException("Connection timed out", new IOException("timeout"));
        }).build();

        var service = new VietQrService(client, "https://api.vietqr.io/v2/banks");
        var ex = assertThrows(ApiException.class, service::getBanks);
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, ex.getCode());
    }

    @Test
    void getBanksThrowsUpstreamErrorWhenCodeNot00() {
        var errorJson = "{\"code\":\"99\",\"desc\":\"System error\",\"data\":null}";
        var client = RestClient.builder().requestInterceptor((request, body, execution) -> {
            var response = new MockClientHttpResponse(errorJson.getBytes(StandardCharsets.UTF_8), HttpStatus.OK);
            response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            return response;
        }).build();

        var service = new VietQrService(client, "https://api.vietqr.io/v2/banks");
        var ex = assertThrows(ApiException.class, service::getBanks);
        assertEquals(ErrorCode.UPSTREAM_ERROR, ex.getCode());
    }
}

