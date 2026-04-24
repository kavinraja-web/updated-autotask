package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.service.GeminiService;
import com.smarttaskmanager.backend.service.GmailService;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.repository.TaskRepository;
import com.smarttaskmanager.backend.service.NotificationService;
import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.service.entity.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private GmailService gmailService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private NotificationService notificationService;

    @PostMapping("/execute")
    public ResponseEntity<String> executeAction(@RequestBody Map<String, Object> payload) {
        String action = (String) payload.get("action");
        Map<String, String> data = (Map<String, String>) payload.get("data");

        try {
            if ("send_email".equals(action)) {
                String to = data.get("to");
                String subject = data.get("subject");
                String body = data.get("body");
                
                List<User> users = userRepository.findAll();
                User activeUser = null;
                for (User u : users) {
                    if (u.getGoogleAccessToken() != null && !u.getGoogleAccessToken().equals("mock-token") && !u.getGoogleAccessToken().isBlank()) {
                        activeUser = u;
                        break;
                    }
                }

                if (activeUser != null) {
                    gmailService.sendEmail(activeUser.getGoogleAccessToken(), to, subject, body);
                } else {
                    return ResponseEntity.status(500).body("{\"status\":\"error\", \"message\":\"No valid Google OAuth token found!\"}");
                }
            } else if ("create_task".equals(action)) {
                String title = data.get("title");
                String description = data.get("description");
                
                List<User> users = userRepository.findAll();
                User activeUser = null;
                for (User u : users) {
                    if (u.getGoogleAccessToken() != null && !u.getGoogleAccessToken().equals("mock-token") && !u.getGoogleAccessToken().isBlank()) {
                        activeUser = u;
                        break;
                    }
                }

                if (activeUser != null) {
                    Task task = new Task();
                    task.setTitle(title != null ? title : "New Agent Task");
                    task.setPriority("Medium");
                    task.setEmailSource(description);
                    task.setUser(activeUser);
                    task.setDeadline(LocalDateTime.now().plusDays(1));
                    taskRepository.save(task);
                    notificationService.createAndSendNotification(activeUser, "AI Agent created task: " + task.getTitle(), "TASK_UPDATE");
                } else {
                    return ResponseEntity.status(500).body("{\"status\":\"error\", \"message\":\"No user found!\"}");
                }
            }
            return ResponseEntity.ok("{\"status\":\"success\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"status\":\"error\", \"message\":\"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chatWithAgent(@RequestBody Map<String, Object> payload) {
        String userMessage = (String) payload.get("message");
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"type\":\"response\", \"message\":\"Please provide a message.\"}");
        }
        
        List<Map<String, String>> history = null;
        if (payload.containsKey("history")) {
            history = (List<Map<String, String>>) payload.get("history");
        }

        String responseJson = geminiService.chatWithWebAgent(userMessage, history);
        return ResponseEntity.ok(responseJson);
    }
}
