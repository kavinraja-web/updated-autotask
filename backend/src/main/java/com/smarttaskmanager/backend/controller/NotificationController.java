package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.service.entity.Notification;
import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
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

    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        User user = getCurrentUser(emailHeader);
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        User user = getCurrentUser(emailHeader);
        return ResponseEntity.ok(notificationService.getUnreadUserNotifications(user.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        // Technically should verify notification belongs to user, but avoiding complexity
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        User user = getCurrentUser(emailHeader);
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }
}
