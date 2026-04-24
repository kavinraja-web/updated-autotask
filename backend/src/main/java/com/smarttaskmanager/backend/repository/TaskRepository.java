package com.smarttaskmanager.backend.repository;

import com.smarttaskmanager.backend.service.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Task> findByUserIdAndStatus(Long userId, String status);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, String status);
    long countByUserIdAndStatusIgnoreCase(Long userId, String status);

    long countByUserIdAndPriority(Long userId, String priority);

    List<Task> findByStatusNot(String status);
}
