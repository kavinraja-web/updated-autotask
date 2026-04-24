package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private User getCurrentUser(String email) {
        if (email == null || email.isBlank()) {
            return userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new RuntimeException("No users found"));
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    @PutMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader,
            @RequestBody Map<String, String> body) {
        User user = getCurrentUser(emailHeader);
        String token = body.get("fcmToken");
        if (token != null && !token.isBlank()) {
            user.setFcmToken(token);
            userRepository.save(user);
        }
        return ResponseEntity.ok(Map.of("message", "FCM token updated successfully"));
    }

    @PutMapping("/preferences/push")
    public ResponseEntity<?> updatePushPreferences(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader,
            @RequestBody Map<String, Boolean> body) {
        User user = getCurrentUser(emailHeader);
        Boolean enabled = body.get("pushNotificationsEnabled");
        if (enabled != null) {
            user.setPushNotificationsEnabled(enabled);
            userRepository.save(user);
        }
        return ResponseEntity.ok(Map.of("message", "Preferences updated", "pushNotificationsEnabled", user.isPushNotificationsEnabled()));
    }
}
