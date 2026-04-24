package com.smarttaskmanager.backend.controller;

import com.smarttaskmanager.backend.repository.EmailLogRepository;
import com.smarttaskmanager.backend.repository.UserRepository;
import com.smarttaskmanager.backend.service.entity.EmailLog;
import com.smarttaskmanager.backend.service.entity.User;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;
import java.util.regex.*;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final EmailLogRepository emailLogRepository;
    private final UserRepository userRepository;

    public ReminderController(EmailLogRepository emailLogRepository, UserRepository userRepository) {
        this.emailLogRepository = emailLogRepository;
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
    public List<Map<String, Object>> getReminders(
            @RequestHeader(value = "X-User-Email", required = false) String emailHeader) {

        User user = getCurrentUser(emailHeader);
        List<EmailLog> emails = emailLogRepository.findTop500ByUserIdOrderByProcessedAtDesc(user.getId());
        List<Map<String, Object>> reminders = new ArrayList<>();

        LocalDate today = LocalDate.now();

        for (EmailLog email : emails) {
            String combined = buildSearchText(email);
            List<DeadlineMatch> matches = extractDeadlines(combined, today);

            for (DeadlineMatch match : matches) {
                Map<String, Object> reminder = new LinkedHashMap<>();
                reminder.put("emailId", email.getId());
                reminder.put("messageId", email.getMessageId());
                reminder.put("subject", email.getSubject());
                reminder.put("sender", email.getSender() != null ? email.getSender() : "Unknown Sender");
                reminder.put("snippet", email.getSnippet());
                reminder.put("body", email.getBody());
                reminder.put("processedAt", email.getProcessedAt() != null ? email.getProcessedAt().toString() : null);
                reminder.put("deadlineText", match.rawText);
                reminder.put("deadlineDate", match.date.toString());
                reminder.put("daysUntil", (int) Duration.between(
                        today.atStartOfDay(), match.date.atStartOfDay()).toDays());
                reminder.put("urgency", classifyUrgency(match.date, today));
                reminders.add(reminder);
                break; // one reminder per email (the earliest deadline found)
            }
        }

        // Sort: overdue first, then soonest deadline first
        reminders.sort(Comparator.comparingInt(r -> (int) r.get("daysUntil")));
        return reminders;
    }

    // ─── Deadline Extraction ──────────────────────────────────────────────────

    private String buildSearchText(EmailLog email) {
        StringBuilder sb = new StringBuilder();
        if (email.getSubject() != null) sb.append(email.getSubject()).append(" ");
        if (email.getSnippet() != null) sb.append(email.getSnippet()).append(" ");
        if (email.getBody()    != null) sb.append(email.getBody());
        return sb.toString();
    }

    private List<DeadlineMatch> extractDeadlines(String text, LocalDate today) {
        List<DeadlineMatch> found = new ArrayList<>();

        // Pattern 1: "15th March", "March 15", "15 March 2026", "March 15, 2026"
        found.addAll(matchOrdinalDate(text, today));

        // Pattern 2: "dd/MM/yyyy" or "MM/dd/yyyy" or "yyyy-MM-dd"
        found.addAll(matchNumericDate(text, today));

        // Pattern 3: Relative — "today", "tomorrow", "this Friday", "next Monday"
        found.addAll(matchRelativeDate(text, today));

        // Pattern 4: "by [date]", "due [date]", "deadline [date]", "submit by [date]"
        // (these are already caught by other patterns inside the full text)

        // Deduplicate and sort
        found.sort(Comparator.comparing(d -> d.date));
        return found;
    }

    // 15th March / March 15th / 15 March 2026
    private static final String[] MONTHS = {
        "january","february","march","april","may","june",
        "july","august","september","october","november","december"
    };
    private static final Pattern ORDINAL_DATE = Pattern.compile(
        "(?i)\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\\s+(\\d{4}))?\\b" +
        "|\\b(january|february|march|april|may|june|july|august|september|october|november|december)\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?\\b"
    );

    private List<DeadlineMatch> matchOrdinalDate(String text, LocalDate today) {
        List<DeadlineMatch> results = new ArrayList<>();
        Matcher m = ORDINAL_DATE.matcher(text);
        while (m.find()) {
            try {
                int day, month, year;
                String raw = m.group();
                if (m.group(1) != null) {
                    // dd Month [yyyy]
                    day   = Integer.parseInt(m.group(1));
                    month = monthIndex(m.group(2));
                    year  = m.group(3) != null ? Integer.parseInt(m.group(3)) : guessYear(today, month, day);
                } else {
                    // Month dd [yyyy]
                    month = monthIndex(m.group(4));
                    day   = Integer.parseInt(m.group(5));
                    year  = m.group(6) != null ? Integer.parseInt(m.group(6)) : guessYear(today, month, day);
                }
                LocalDate date = LocalDate.of(year, month, day);
                results.add(new DeadlineMatch(date, raw));
            } catch (Exception ignored) {}
        }
        return results;
    }

    private static final Pattern NUMERIC_DATE = Pattern.compile(
        "\\b(\\d{4})-(\\d{2})-(\\d{2})\\b" +           // yyyy-MM-dd
        "|\\b(\\d{1,2})/(\\d{1,2})/(\\d{4})\\b"         // dd/MM/yyyy or MM/dd/yyyy
    );

    private List<DeadlineMatch> matchNumericDate(String text, LocalDate today) {
        List<DeadlineMatch> results = new ArrayList<>();
        Matcher m = NUMERIC_DATE.matcher(text);
        while (m.find()) {
            try {
                LocalDate date;
                String raw = m.group();
                if (m.group(1) != null) {
                    date = LocalDate.of(
                        Integer.parseInt(m.group(1)),
                        Integer.parseInt(m.group(2)),
                        Integer.parseInt(m.group(3)));
                } else {
                    int a = Integer.parseInt(m.group(4));
                    int b = Integer.parseInt(m.group(5));
                    int y = Integer.parseInt(m.group(6));
                    // Heuristic: if a > 12, it's day/month; else treat as month/day
                    date = (a > 12) ? LocalDate.of(y, b, a) : LocalDate.of(y, a, b);
                }
                results.add(new DeadlineMatch(date, raw));
            } catch (Exception ignored) {}
        }
        return results;
    }

    private List<DeadlineMatch> matchRelativeDate(String text, LocalDate today) {
        List<DeadlineMatch> results = new ArrayList<>();
        String lower = text.toLowerCase();
        if (lower.contains("today"))    results.add(new DeadlineMatch(today, "today"));
        if (lower.contains("tomorrow")) results.add(new DeadlineMatch(today.plusDays(1), "tomorrow"));

        String[] dayNames = {"monday","tuesday","wednesday","thursday","friday","saturday","sunday"};
        for (int i = 0; i < dayNames.length; i++) {
            String day = dayNames[i];
            boolean nextKeyword = lower.contains("next " + day);
            boolean thisKeyword = lower.contains("this " + day);
            if (nextKeyword || thisKeyword) {
                DayOfWeek target = DayOfWeek.of(i + 1);
                LocalDate candidate = today;
                do { candidate = candidate.plusDays(1); }
                while (candidate.getDayOfWeek() != target);
                if (nextKeyword) candidate = candidate.plusWeeks(1);
                results.add(new DeadlineMatch(candidate, (nextKeyword ? "next " : "this ") + day));
            }
        }
        return results;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private int monthIndex(String name) {
        for (int i = 0; i < MONTHS.length; i++) {
            if (MONTHS[i].equalsIgnoreCase(name)) return i + 1;
        }
        throw new IllegalArgumentException("Unknown month: " + name);
    }

    private int guessYear(LocalDate today, int month, int day) {
        int y = today.getYear();
        LocalDate candidate = LocalDate.of(y, month, day);
        // If the date has already passed this year, assume next year
        if (candidate.isBefore(today.minusDays(1))) return y + 1;
        return y;
    }

    private String classifyUrgency(LocalDate deadline, LocalDate today) {
        long days = Duration.between(today.atStartOfDay(), deadline.atStartOfDay()).toDays();
        if (days < 0)  return "Overdue";
        if (days == 0) return "Today";
        if (days == 1) return "Tomorrow";
        if (days <= 3) return "Critical";
        if (days <= 7) return "High";
        if (days <= 14) return "Medium";
        return "Low";
    }

    private static class DeadlineMatch {
        LocalDate date;
        String rawText;
        DeadlineMatch(LocalDate date, String rawText) {
            this.date = date;
            this.rawText = rawText;
        }
    }
}
