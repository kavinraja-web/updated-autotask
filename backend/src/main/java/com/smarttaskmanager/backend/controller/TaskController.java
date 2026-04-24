package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.service.entity.Task;
import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.TaskRepository;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository, NotificationService notificationService) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    private User getCurrentUser(String email) {
        if (email == null || email.isBlank()) {
            // Fallback for demo if no header provided
            return userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new RuntimeException("No users found and no email header provided"));
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    @GetMapping
    public List<Task> getTasks(@RequestHeader(value = "X-User-Email", required = false) String emailHeader) {
        return taskRepository.findByUserIdOrderByCreatedAtDesc(getCurrentUser(emailHeader).getId());
    }



    @PostMapping
    public Task createTask(@RequestHeader(value = "X-User-Email", required = false) String emailHeader,
            @RequestBody Task task) {
        User user = getCurrentUser(emailHeader);
        task.setUser(user);
        Task savedTask = taskRepository.save(task);
        notificationService.createAndSendNotification(user, "New task created: " + savedTask.getTitle(), "TASK_UPDATE");
        return savedTask;
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Task> completeTask(@PathVariable Long id) {
        return taskRepository.findById(id).map(task -> {
            task.setStatus("Completed");
            Task saved = taskRepository.save(task);
            notificationService.createAndSendNotification(task.getUser(), "Task completed: " + task.getTitle(), "TASK_UPDATE");
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (taskRepository.existsById(id)) {
            taskRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
