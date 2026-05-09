package com.smarttaskmanager.backend.repository;

import com.smarttaskmanager.backend.service.entity.EmailDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailDraftRepository extends JpaRepository<EmailDraft, Long> {
    List<EmailDraft> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<EmailDraft> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, EmailDraft.Status status);
}
