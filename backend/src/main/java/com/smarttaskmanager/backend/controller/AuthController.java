package com.smarttaskmanager.backend.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String idTokenString = body.get("idToken");
        String accessToken = body.get("accessToken");

        String email = null;
        String name = null;
        String providerId = null;

        try {
            // Priority 1: Verify ID Token (JWT)
            if (idTokenString != null && idTokenString.contains(".")) {
                try {
                    GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                            new NetHttpTransport(), GsonFactory.getDefaultInstance())
                            .setAudience(Collections.singletonList(googleClientId))
                            .build();

                    GoogleIdToken idToken = verifier.verify(idTokenString);
                    if (idToken != null) {
                        GoogleIdToken.Payload payload = idToken.getPayload();
                        email = payload.getEmail();
                        name = (String) payload.get("name");
                        providerId = payload.getSubject();
                    }
                } catch (Exception e) {
                    System.err.println("ID Token verification failed, falling back to Access Token: " + e.getMessage());
                }
            }

            // Priority 2: Use Access Token to get user info if email is still null
            if (email == null && accessToken != null) {
                String userInfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + accessToken;
                @SuppressWarnings("unchecked")
                Map<String, Object> userInfo = restTemplate.getForObject(userInfoUrl, Map.class);
                if (userInfo != null) {
                    email = (String) userInfo.get("email");
                    name = (String) userInfo.get("name");
                    providerId = (String) userInfo.get("sub");
                }
            }

            if (email == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Failed to verify authentication"));
            }

            // Save or update user
            Optional<User> existingUser = userRepository.findByEmail(email);
            User user = existingUser.orElse(new User());
            user.setEmail(email);
            user.setName(name != null ? name : email);
            user.setProviderId(providerId);
            if (accessToken != null) {
                user.setGoogleAccessToken(accessToken);
            }
            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                    "message", "User synchronized",
                    "email", email,
                    "name", user.getName()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Auth sync failed: " + e.getMessage()));
        }
    }
}
