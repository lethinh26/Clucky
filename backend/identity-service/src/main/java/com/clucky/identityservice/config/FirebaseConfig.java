package com.clucky.identityservice.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "clucky.auth.google.enabled", havingValue = "true")
public class FirebaseConfig {
    @Bean(destroyMethod = "delete")
    FirebaseApp firebaseApp(@Value("${clucky.auth.google.project-id:}") String projectId) throws IOException {
        if (projectId.isBlank() || System.getenv("FIREBASE_AUTH_EMULATOR_HOST") != null) {
            throw new IllegalStateException("Configure the Firebase project and disable the auth emulator");
        }
        FirebaseOptions options = FirebaseOptions.builder()
                .setProjectId(projectId)
                .setCredentials(GoogleCredentials.getApplicationDefault())
                .setConnectTimeout(5000)
                .setReadTimeout(5000)
                .build();
        return FirebaseApp.initializeApp(options, "clucky-identity");
    }

    @Bean
    FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
