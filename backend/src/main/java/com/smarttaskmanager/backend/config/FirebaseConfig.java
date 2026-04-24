package com.smarttaskmanager.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        try {
            // Load from classpath if available (e.g. src/main/resources/firebase-service-account.json)
            InputStream serviceAccount = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
            
            if (serviceAccount != null && FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();
                FirebaseApp.initializeApp(options);
                System.out.println("FirebaseApp initialized successfully.");
            } else if (serviceAccount == null) {
                System.out.println("firebase-service-account.json not found. FCM will be disabled.");
            }
        } catch (Exception e) {
            System.err.println("Failed to initialize FirebaseApp: " + e.getMessage());
        }
    }
}
