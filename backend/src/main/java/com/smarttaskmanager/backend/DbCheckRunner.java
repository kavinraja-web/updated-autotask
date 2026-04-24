package com.smarttaskmanager.backend;

import com.smarttaskmanager.backend.service.entity.User;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.repository.TaskRepository;
import com.smarttaskmanager.backend.repository.EmailLogRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DbCheckRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final EmailLogRepository emailLogRepository;

    public DbCheckRunner(UserRepository userRepository, TaskRepository taskRepository,
            EmailLogRepository emailLogRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.emailLogRepository = emailLogRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("\n--- DATABASE CHECK ---");
        List<User> users = userRepository.findAll();
        System.out.println("Total Users: " + users.size());
        for (User u : users) {
            System.out.println("User: " + u.getEmail() + " | Name: " + u.getName());
            System.out.println(
                    "Has Access Token: " + (u.getGoogleAccessToken() != null && !u.getGoogleAccessToken().isBlank()));
            if (u.getGoogleAccessToken() != null) {
                System.out.println("Token Snippet: "
                        + u.getGoogleAccessToken().substring(0, Math.min(10, u.getGoogleAccessToken().length()))
                        + "...");
            }
        }

        System.out.println("Total Tasks: " + taskRepository.count());
        System.out.println("Total Email Logs: " + emailLogRepository.count());
        System.out.println("--- END DATABASE CHECK ---\n");
    }
}
