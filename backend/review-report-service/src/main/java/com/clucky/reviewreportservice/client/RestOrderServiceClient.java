package com.clucky.reviewreportservice.client;

import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class RestOrderServiceClient implements OrderServiceClient {

    private final RestTemplate restTemplate;

    public RestOrderServiceClient(@Qualifier("orderRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public OrderVerificationDto getOrderForReview(Long orderId, Long customerId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken token) || !token.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token.getToken().getTokenValue());
        try {
            OrderVerificationDto order = restTemplate.exchange(
                    "http://cart-order-service/api/internal/orders/{orderId}/verification?customerId={customerId}",
                    HttpMethod.GET, new HttpEntity<>(headers), OrderVerificationDto.class, orderId, customerId).getBody();
            if (order == null) {
                throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            }
            return order;
        } catch (HttpClientErrorException.NotFound failure) {
            return null;
        } catch (HttpClientErrorException.Unauthorized failure) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        } catch (HttpClientErrorException.Forbidden failure) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        } catch (ResourceAccessException | HttpServerErrorException.ServiceUnavailable | IllegalStateException failure) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (RestClientException failure) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
    }
}
