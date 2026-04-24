package com.smarttaskmanager.backend.service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private LocalDateTime deadline;

    // High, Medium, Low
    private String priority;

    // Pending, Completed
    @Column(nullable = false)
    private String status = "Pending";

    @Column(name = "email_source", length = 1000)
    private String emailSource;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category;

    private String effort;

    private LocalDateTime createdAt = LocalDateTime.now();

    private boolean reminder24hSent = false;
    private boolean reminder4hSent = false;
    private boolean reminder1hSent = false;
    private boolean overdueReminderSent = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDateTime getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDateTime deadline) {
        this.deadline = deadline;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getEmailSource() {
        return emailSource;
    }

    public void setEmailSource(String emailSource) {
        this.emailSource = emailSource;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getEffort() {
        return effort;
    }

    public void setEffort(String effort) {
        this.effort = effort;
    }

    public boolean isReminder24hSent() {
        return reminder24hSent;
    }

    public void setReminder24hSent(boolean reminder24hSent) {
        this.reminder24hSent = reminder24hSent;
    }

    public boolean isReminder4hSent() {
        return reminder4hSent;
    }

    public void setReminder4hSent(boolean reminder4hSent) {
        this.reminder4hSent = reminder4hSent;
    }

    public boolean isReminder1hSent() {
        return reminder1hSent;
    }

    public void setReminder1hSent(boolean reminder1hSent) {
        this.reminder1hSent = reminder1hSent;
    }

    public boolean isOverdueReminderSent() {
        return overdueReminderSent;
    }

    public void setOverdueReminderSent(boolean overdueReminderSent) {
        this.overdueReminderSent = overdueReminderSent;
    }
}
