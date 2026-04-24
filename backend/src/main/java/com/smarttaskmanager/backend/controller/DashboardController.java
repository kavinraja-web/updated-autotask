package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.TaskRepository;
import com.smarttaskmanager.backend.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public DashboardController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
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
    public Map<String, Object> getDashboardStats(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        Long userId = getCurrentUser(emailHeader).getId();

        long totalTasks = taskRepository.countByUserId(userId);
        long completedTasks = taskRepository.countByUserIdAndStatusIgnoreCase(userId, "Completed");
        long pendingTasks = taskRepository.countByUserIdAndStatusIgnoreCase(userId, "Pending");
        long highPriorityTasks = taskRepository.countByUserIdAndPriority(userId, "High");

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTasks", totalTasks);
        stats.put("completedTasks", completedTasks);
        stats.put("pendingTasks", pendingTasks);
        stats.put("highPriorityTasks", highPriorityTasks);

        return stats;
    }
}
