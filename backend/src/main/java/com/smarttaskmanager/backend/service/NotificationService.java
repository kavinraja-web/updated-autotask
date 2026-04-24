package com.smarttaskmanager.backend.service;

import com.smarttaskmanager.backend.service.entity.Notification;
import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.NotificationRepository;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository, SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public Notification createAndSendNotification(User user, String message, String type) {
        // 1. Save to database
        Notification notification = new Notification(user, message, type);
        Notification saved = notificationRepository.save(notification);

        // 2. Send via WebSocket
        // Clients will subscribe to /topic/notifications/{userId}
        String destination = "/topic/notifications/" + user.getId();
        messagingTemplate.convertAndSend(destination, saved);

        // 3. Send via Firebase Cloud Messaging (FCM) if background push is enabled
        if (user.isPushNotificationsEnabled() && user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
            try {
                // Determine notification title based on type
                String title = "SmartTask Ai Alert";
                if ("REMINDER".equals(type)) title = "Upcoming Reminder";
                else if ("TASK_UPDATE".equals(type)) title = "Task Updated";

                Message fcmMessage = Message.builder()
                        .setToken(user.getFcmToken())
                        .setNotification(com.google.firebase.messaging.Notification.builder()
                                .setTitle(title)
                                .setBody(message)
                                .build())
                        .build();

                FirebaseMessaging.getInstance().send(fcmMessage);
            } catch (Exception e) {
                System.err.println("Failed to send FCM push notification: " + e.getMessage());
            }
        }

        return saved;
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadUserNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }
}
