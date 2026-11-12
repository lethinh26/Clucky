package com.clucky.promotionloyaltyservice.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("cloudinary")
public record CloudinaryProperties(boolean enabled, String cloudName, @JsonIgnore String apiKey,
        @JsonIgnore String apiSecret, String folder) {
    public CloudinaryProperties {
        if (enabled && (cloudName == null || cloudName.isBlank() || apiKey == null || apiKey.isBlank()
                || apiSecret == null || apiSecret.isBlank() || folder == null || folder.isBlank())) {
            throw new IllegalArgumentException("Enabled Cloudinary requires configured credentials and folder");
        }
    }

    @Override
    public String toString() { return "CloudinaryProperties[credentials redacted]"; }
}
