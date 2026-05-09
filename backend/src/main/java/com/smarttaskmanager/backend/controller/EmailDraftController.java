package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.repository.EmailDraftRepository;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.service.entity.EmailDraft;
import com.smarttaskmanager.backend.service.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/email-drafts")
public class EmailDraftController {

    private final EmailDraftRepository emailDraftRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    public EmailDraftController(EmailDraftRepository emailDraftRepository, UserRepository userRepository) {
        this.emailDraftRepository = emailDraftRepository;
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
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
    public ResponseEntity<List<EmailDraft>> getDrafts(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader,
            @RequestParam(value = "status", required = false) EmailDraft.Status status) {
        User user = getCurrentUser(emailHeader);
        List<EmailDraft> drafts;
        if (status != null) {
            drafts = emailDraftRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), status);
        } else {
            drafts = emailDraftRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        }
        return ResponseEntity.ok(drafts);
    }

    public static class DraftPayload {
        private String userEmail;
        private String messageId;
        private String threadId;
        private String sender;
        private String subject;
        private String originalEmailText;
        private String generatedReply;
        private String replyWebhookUrl;

        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

        public String getMessageId() { return messageId; }
        public void setMessageId(String messageId) { this.messageId = messageId; }

        public String getThreadId() { return threadId; }
        public void setThreadId(String threadId) { this.threadId = threadId; }

        public String getSender() { return sender; }
        public void setSender(String sender) { this.sender = sender; }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }

        public String getOriginalEmailText() { return originalEmailText; }
        public void setOriginalEmailText(String originalEmailText) { this.originalEmailText = originalEmailText; }

        public String getGeneratedReply() { return generatedReply; }
        public void setGeneratedReply(String generatedReply) { this.generatedReply = generatedReply; }

        public String getReplyWebhookUrl() { return replyWebhookUrl; }
        public void setReplyWebhookUrl(String replyWebhookUrl) { this.replyWebhookUrl = replyWebhookUrl; }
    }

    // n8n will call this endpoint
    @PostMapping("/webhook")
    public ResponseEntity<?> receiveDraftFromN8n(@RequestBody DraftPayload payload) {
        try {
            User user = getCurrentUser(payload.getUserEmail());
            EmailDraft draft = new EmailDraft();
            draft.setUser(user);
            draft.setMessageId(payload.getMessageId());
            draft.setThreadId(payload.getThreadId());
            draft.setSender(payload.getSender());
            draft.setSubject(payload.getSubject());
            draft.setOriginalEmailText(payload.getOriginalEmailText());
            draft.setGeneratedReply(payload.getGeneratedReply());
            draft.setReplyWebhookUrl(payload.getReplyWebhookUrl());
            draft.setStatus(EmailDraft.Status.PENDING);
            
            emailDraftRepository.save(draft);
            return ResponseEntity.ok(Map.of("message", "Draft saved successfully", "id", draft.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveDraft(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        User user = getCurrentUser(emailHeader);
        EmailDraft draft = emailDraftRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Draft not found"));

        if (!draft.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }

        if (draft.getStatus() != EmailDraft.Status.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("error", "Draft is not pending"));
        }

        // Call n8n webhook if URL is provided
        if (draft.getReplyWebhookUrl() != null && !draft.getReplyWebhookUrl().isBlank()) {
            try {
                // We pass the relevant details back to n8n so it knows what to send
                restTemplate.postForEntity(draft.getReplyWebhookUrl(), Map.of(
                        "messageId", draft.getMessageId() != null ? draft.getMessageId() : "",
                        "threadId", draft.getThreadId() != null ? draft.getThreadId() : "",
                        "sender", draft.getSender() != null ? draft.getSender() : "",
                        "subject", draft.getSubject() != null ? draft.getSubject() : "",
                        "generatedReply", draft.getGeneratedReply() != null ? draft.getGeneratedReply() : "",
                        "userEmail", user.getEmail()
                ), String.class);
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to call n8n webhook: " + e.getMessage()));
            }
        }

        draft.setStatus(EmailDraft.Status.APPROVED);
        emailDraftRepository.save(draft);
        return ResponseEntity.ok(Map.of("message", "Draft approved and sent", "draft", draft));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectDraft(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        User user = getCurrentUser(emailHeader);
        EmailDraft draft = emailDraftRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Draft not found"));

        if (!draft.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }

        draft.setStatus(EmailDraft.Status.REJECTED);
        emailDraftRepository.save(draft);
        return ResponseEntity.ok(Map.of("message", "Draft rejected", "draft", draft));
    }
}
