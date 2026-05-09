package com.smarttaskmanager.backend.service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_drafts")
public class EmailDraft {

    public enum Status {
        PENDING, APPROVED, REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String messageId;
    
    private String threadId;

    private String sender;

    private String subject;

    @Column(columnDefinition = "TEXT")
    private String originalEmailText;

    @Column(columnDefinition = "TEXT")
    private String generatedReply;

    private String replyWebhookUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    public String getThreadId() {
        return threadId;
    }

    public void setThreadId(String threadId) {
        this.threadId = threadId;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getOriginalEmailText() {
        return originalEmailText;
    }

    public void setOriginalEmailText(String originalEmailText) {
        this.originalEmailText = originalEmailText;
    }

    public String getGeneratedReply() {
        return generatedReply;
    }

    public void setGeneratedReply(String generatedReply) {
        this.generatedReply = generatedReply;
    }

    public String getReplyWebhookUrl() {
        return replyWebhookUrl;
    }

    public void setReplyWebhookUrl(String replyWebhookUrl) {
        this.replyWebhookUrl = replyWebhookUrl;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
