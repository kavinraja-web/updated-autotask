package com.smarttaskmanager.backend.service;

import com.smarttaskmanager.backend.repository.TaskRepository;
import com.smarttaskmanager.backend.service.entity.Task;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class TaskReminderScheduler {

    private final TaskRepository taskRepository;
    private final NotificationService notificationService;

    public TaskReminderScheduler(TaskRepository taskRepository, NotificationService notificationService) {
        this.taskRepository = taskRepository;
        this.notificationService = notificationService;
    }

    // Runs every minute to check for upcoming deadlines and overdue tasks
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processTaskReminders() {
        System.out.println("[Scheduler] Running Task Reminder Push Notification Pass...");
        LocalDateTime now = LocalDateTime.now();
        
        // Find tasks that are not yet marked as 'Completed'
        List<Task> pendingTasks = taskRepository.findByStatusNot("Completed");
        
        for (Task task : pendingTasks) {
            if (task.getDeadline() == null) continue;
            
            long hoursUntilDeadline = ChronoUnit.HOURS.between(now, task.getDeadline());
            
            // 1. OVERDUE LOGIC: If the deadline has already passed
            if (now.isAfter(task.getDeadline())) {
                if (!task.isOverdueReminderSent()) {
                    notificationService.createAndSendNotification(
                        task.getUser(),
                        "🚨 OVERDUE: Your task '" + task.getTitle() + "' was due back on " + task.getDeadline().toLocalDate() + "!",
                        "REMINDER"
                    );
                    task.setOverdueReminderSent(true);
                    taskRepository.save(task);
                }
                continue; // Skip the upcoming reminders for overdue tasks
            }
            
            // 2. TIMED MESSAGES: If the task ends tomorrow, send 3 messages based on time counting down
            
            // Reminder #1: Less than 24 hours (Due Tomorrow)
            if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 4 && !task.isReminder24hSent()) {
                notificationService.createAndSendNotification(
                    task.getUser(),
                    "📅 Reminder: Your task '" + task.getTitle() + "' is due tomorrow!",
                    "REMINDER"
                );
                task.setReminder24hSent(true);
                taskRepository.save(task);
            }
            
            // Reminder #2: Less than 4 hours
            if (hoursUntilDeadline <= 4 && hoursUntilDeadline > 1 && !task.isReminder4hSent()) {
                notificationService.createAndSendNotification(
                    task.getUser(),
                    "⏳ Action Needed: Your task '" + task.getTitle() + "' is due in just 4 hours!",
                    "REMINDER"
                );
                task.setReminder4hSent(true);
                taskRepository.save(task);
            }
            
            // Reminder #3: Less than 1 hour (Final Warning)
            if (hoursUntilDeadline <= 1 && hoursUntilDeadline >= 0 && !task.isReminder1hSent()) {
                notificationService.createAndSendNotification(
                    task.getUser(),
                    "🔥 URGENT: Your task '" + task.getTitle() + "' is due soon! Less than 1 hour remains.",
                    "REMINDER"
                );
                task.setReminder1hSent(true);
                taskRepository.save(task);
            }
        }
    }
}
