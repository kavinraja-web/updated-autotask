package com.smarttaskmanager.backend.repository;

import com.smarttaskmanager.backend.service.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    boolean existsByMessageId(String messageId);

    List<EmailLog> findTop500ByUserIdOrderByProcessedAtDesc(Long userId);

    // Find emails by status (derived query — JPA handles the enum mapping)
    List<EmailLog> findByUserIdAndAiStatusOrderByProcessedAtDesc(
            @Param("userId") Long userId,
            @Param("aiStatus") EmailLog.AiStatus aiStatus);

    // Also find rows where ai_status is NULL (pre-migration rows treated as PENDING)
    List<EmailLog> findByUserIdAndAiStatusIsNullOrderByProcessedAtDesc(Long userId);

    // Count emails awaiting analysis (PENDING status)
    long countByUserIdAndAiStatus(Long userId, EmailLog.AiStatus aiStatus);

    // Count emails where ai_status is NULL (legacy rows)
    long countByUserIdAndAiStatusIsNull(Long userId);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM EmailLog e WHERE e.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
