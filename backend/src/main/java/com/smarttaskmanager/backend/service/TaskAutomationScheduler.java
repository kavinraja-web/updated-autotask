package com.smarttaskmanager.backend.service;

import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.service.entity.Task;
import com.smarttaskmanager.backend.service.entity.EmailLog;
import com.smarttaskmanager.backend.repository.EmailLogRepository;
import com.smarttaskmanager.backend.repository.TaskRepository;
import com.smarttaskmanager.backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TaskAutomationScheduler {

    private final GmailService gmailService;
    private final GeminiService geminiService;
    private final EmailLogRepository emailLogRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public TaskAutomationScheduler(GmailService gmailService, GeminiService geminiService,
            EmailLogRepository emailLogRepository, TaskRepository taskRepository,
            UserRepository userRepository, NotificationService notificationService) {
        this.gmailService = gmailService;
        this.geminiService = geminiService;
        this.emailLogRepository = emailLogRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    // Scheduled sync: runs every 15 minutes to pull new emails
    @Scheduled(cron = "${automation.schedule.cron:0 */15 * * * *}")
    @Transactional
    public void scanAndGenerateTasks() {
        System.out.println("[Scheduler] Running scheduled email sync...");
        List<User> users = userRepository.findAll();
        for (User user : users) {
            syncEmailsForUser(user);
        }
    }

    /**
     * PHASE 1: Bulk-save ALL emails from last 48h to DB immediately.
     * No AI analysis here — just raw inbox mirroring.
     */
    public int syncEmailsForUser(User user) {
        String token = user.getGoogleAccessToken();
        if (token == null || token.isBlank()) {
            System.out.println("[Scheduler] Skipping user " + user.getEmail() + " — no Gmail access token.");
            return 0;
        }

        List<GmailService.EmailDto> recentEmails;
        try {
            recentEmails = gmailService.getRecentEmails(token);
        } catch (Exception e) {
            System.err.println("[Scheduler] Gmail fetch failed for " + user.getEmail() + ": " + e.getMessage());
            // Rethrow so the controller can return the right HTTP status
            throw e;
        }

        System.out.println("[Scheduler] Fetched " + recentEmails.size() + " emails from Gmail for " + user.getEmail());

        int savedCount = 0;
        for (GmailService.EmailDto email : recentEmails) {
            if (!emailLogRepository.existsByMessageId(email.getId())) {
                EmailLog emailLog = new EmailLog();
                emailLog.setMessageId(email.getId());
                emailLog.setSubject(email.getSubject());
                emailLog.setSender(email.getFrom());
                emailLog.setSnippet(email.getSnippet());
                emailLog.setBody(email.getBody());
                emailLog.setUser(user);
                emailLog.setAiStatus(EmailLog.AiStatus.PENDING);
                try {
                    emailLogRepository.save(emailLog);
                    savedCount++;
                } catch (Exception ex) {
                    System.err.println("[Scheduler] Failed to save email '" + email.getSubject() + "': " + ex.getMessage());
                }
            }
        }

        System.out.println("[Scheduler] Saved " + savedCount + " new emails for " + user.getEmail());
        return savedCount;
    }

    /**
     * PHASE 2: Run AI analysis on all PENDING emails in background.
     * Called after Phase 1 completes. Runs async so it doesn't block the HTTP response.
     */
    @Async
    public void analyzeAllPendingEmailsAsync(User user) {
        // Fetch PENDING emails + legacy rows with null ai_status
        List<EmailLog> pendingEmails = new java.util.ArrayList<>();
        pendingEmails.addAll(emailLogRepository.findByUserIdAndAiStatusOrderByProcessedAtDesc(
                user.getId(), EmailLog.AiStatus.PENDING));
        pendingEmails.addAll(emailLogRepository.findByUserIdAndAiStatusIsNullOrderByProcessedAtDesc(
                user.getId()));

        System.out.println("[AI Analyzer] Starting background AI analysis for " + pendingEmails.size() + " pending emails of " + user.getEmail());

        for (EmailLog emailLog : pendingEmails) {
            try {
                Thread.sleep(1500); // Respect Gemini free-tier rate limits
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }

            try {
                GeminiService.TaskAnalysisResult result = geminiService.analyzeEmailForTask(
                        emailLog.getSubject(), emailLog.getBody(), false);

                if (result != null) {
                    if ("task".equalsIgnoreCase(result.getAction())) {
                        Task task = new Task();
                        task.setTitle("Review: " + emailLog.getSubject());
                        task.setPriority("Medium");
                        task.setEmailSource(emailLog.getSubject());
                        task.setUser(user);
                        task.setDeadline(LocalDateTime.now().plusDays(1));
                        taskRepository.save(task);
                        notificationService.createAndSendNotification(
                                user, "New Task Auto-Generated: Review " + emailLog.getSubject(), "TASK_UPDATE");
                        System.out.println("[AI Analyzer] Created task for: " + emailLog.getSubject());
                    } else {
                        System.out.println("[AI Analyzer] Action '" + result.getAction() + "' for: " + emailLog.getSubject());
                    }
                    emailLog.setAiStatus(EmailLog.AiStatus.ANALYZED);
                } else {
                    emailLog.setAiStatus(EmailLog.AiStatus.IGNORED);
                }
                emailLogRepository.save(emailLog);

            } catch (Exception e) {
                System.err.println("[AI Analyzer] Error analyzing email '" + emailLog.getSubject() + "': " + e.getMessage());
                // Don't mark as analyzed — will retry next scan
            }
        }

        System.out.println("[AI Analyzer] Background AI analysis complete for " + user.getEmail());
    }

    /** Legacy entry point kept for compatibility — now calls both phases */
    public void processEmailsForUser(User user) {
        syncEmailsForUser(user);
        analyzeAllPendingEmailsAsync(user);
    }
}
