package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.service.entity.EmailLog;
import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.EmailLogRepository;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.service.TaskAutomationScheduler;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/emails")
public class EmailController {

    private final EmailLogRepository emailLogRepository;
    private final UserRepository userRepository;
    private final TaskAutomationScheduler taskAutomationScheduler;

    public EmailController(EmailLogRepository emailLogRepository, UserRepository userRepository,
            TaskAutomationScheduler taskAutomationScheduler) {
        this.emailLogRepository = emailLogRepository;
        this.userRepository = userRepository;
        this.taskAutomationScheduler = taskAutomationScheduler;
    }

    private User getCurrentUser(String email) {
        if (email == null || email.isBlank()) {
            return userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new RuntimeException("No users found"));
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    /** Returns all stored emails (all statuses) ordered newest first */
    @GetMapping
    public List<EmailLog> getRecentEmails(@RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        return emailLogRepository.findTop500ByUserIdOrderByProcessedAtDesc(getCurrentUser(emailHeader).getId());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailLog> getEmailById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        User user = getCurrentUser(emailHeader);
        return emailLogRepository.findById(id)
                .filter(email -> email.getUser() != null && email.getUser().getId().equals(user.getId()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PHASE 1: Fast sync — pulls ALL 48h emails from Gmail and saves to DB.
     * Returns immediately once all emails are saved. No AI blocking.
     */
    @PostMapping("/sync-inbox")
    public ResponseEntity<?> syncInbox(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        try {
            List<User> users = emailHeader != null && !emailHeader.isBlank()
                    ? List.of(getCurrentUser(emailHeader))
                    : userRepository.findAll();

            int totalSaved = 0;
            for (User user : users) {
                int saved = taskAutomationScheduler.syncEmailsForUser(user);
                totalSaved += saved;
            }

            long pendingCount = users.stream()
                    .mapToLong(u -> emailLogRepository.countByUserIdAndAiStatus(u.getId(), EmailLog.AiStatus.PENDING)
                            + emailLogRepository.countByUserIdAndAiStatusIsNull(u.getId()))
                    .sum();

            return ResponseEntity.ok(Map.of(
                    "message", "Inbox synced successfully.",
                    "newEmailsSaved", totalSaved,
                    "pendingAiAnalysis", pendingCount
            ));
        } catch (Exception e) {
            System.err.println("[EmailController] Sync error: " + e.getMessage());
            String rawMsg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            String causeMsg = (e.getCause() != null && e.getCause().getMessage() != null) ? " " + e.getCause().getMessage() : "";
            String msg = rawMsg + causeMsg;
            if (msg.contains("Invalid Credentials") || msg.contains("401") || msg.contains("400")
                    || msg.contains("unauthorized") || msg.contains("invalid_grant")
                    || msg.contains("Token has been expired") || msg.contains("revoked")) {
                return ResponseEntity.status(401).body(Map.of(
                        "error", "Gmail session expired. Please log out and sign in with Google again."));
            }
            return ResponseEntity.status(500).body(Map.of("error", "Sync failed: " + msg));
        }
    }

    /**
     * PHASE 2: Trigger background AI analysis on all PENDING emails.
     * Returns immediately — analysis runs in a background thread.
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> triggerAiAnalysis(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        try {
            List<User> users = emailHeader != null && !emailHeader.isBlank()
                    ? List.of(getCurrentUser(emailHeader))
                    : userRepository.findAll();

            // First sync inbox to get any new emails
            for (User user : users) {
                taskAutomationScheduler.syncEmailsForUser(user);
            }

            long totalPending = users.stream()
                    .mapToLong(u -> emailLogRepository.countByUserIdAndAiStatus(u.getId(), EmailLog.AiStatus.PENDING)
                            + emailLogRepository.countByUserIdAndAiStatusIsNull(u.getId()))
                    .sum();

            // Fire off AI analysis in background for each user
            for (User user : users) {
                taskAutomationScheduler.analyzeAllPendingEmailsAsync(user);
            }

            return ResponseEntity.ok(Map.of(
                    "message", "AI analysis started in background for " + totalPending + " emails.",
                    "pendingEmails", totalPending
            ));
        } catch (Exception e) {
            System.err.println("[EmailController] Analyze trigger error: " + e.getMessage());
            String rawMsg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            String causeMsg = (e.getCause() != null && e.getCause().getMessage() != null) ? " " + e.getCause().getMessage() : "";
            String msg = rawMsg + causeMsg;
            if (msg.contains("Invalid Credentials") || msg.contains("401") || msg.contains("400")
                    || msg.contains("unauthorized") || msg.contains("invalid_grant")
                    || msg.contains("Token has been expired") || msg.contains("revoked")) {
                return ResponseEntity.status(401).body(Map.of(
                        "error", "Gmail session expired. Please log out and sign in with Google again."));
            }
            return ResponseEntity.status(500).body(Map.of("error", "Error triggering analysis: " + msg));
        }
    }
}
