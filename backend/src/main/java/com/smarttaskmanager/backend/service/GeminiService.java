package com.smarttaskmanager.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TaskAnalysisResult analyzeEmailForTask(String subject, String body, boolean autoSend) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("YOUR_OPENAI_API_KEY") || apiKey.equals("YOUR_NEW_OPEN_AI_API_KEY_HERE")) {
            System.out.println("[AI Service] No valid API key set. Using Smart Heuristic Fallback.");
            return createFallbackResult(subject, body);
        }

        // We are using Google's free Gemini API here!
        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        System.out.println("[AI Service] Analyzing email via Free Gemini API: " + subject);

        String prompt = "You are an Autonomous Email Agent connected to Gmail.\n" +
                "Your role is to analyze emails, generate tasks, and intelligently handle replies.\n\n" +
                "🎯 CORE GOAL:\n" +
                "Reduce user workload by deciding when to reply and taking action if permitted.\n\n" +
                "⚙️ PERMISSION SYSTEM:\n" +
                "You MUST follow this rule strictly:\n" +
                "- If \"auto_send\" = false → ONLY generate reply draft\n" +
                "- If \"auto_send\" = true → Generate reply AND mark it ready to send\n\n" +
                "NEVER send emails without explicit permission.\n\n" +
                "🧠 DECISION PROCESS:\n" +
                "1. Understand the email\n" +
                "   - Is a reply needed?\n" +
                "   - Urgency level?\n" +
                "   - Sender importance?\n\n" +
                "2. Decide action:\n" +
                "   - reply\n" +
                "   - task\n" +
                "   - ignore\n\n" +
                "3. If reply is needed:\n" +
                "   - Write a clear, professional response\n" +
                "   - Match tone (formal / friendly)\n\n" +
                "📦 OUTPUT FORMAT:\n" +
                "{\n" +
                "  \"action\": \"reply | task | ignore\",\n" +
                "  \"reply_needed\": true,\n" +
                "  \"reply_draft\": \"\",\n" +
                "  \"send_email\": false,\n" +
                "  \"deadline\": \"YYYY-MM-DDTHH:mm:ss\" (or null if none found),\n" +
                "  \"confidence\": \"high | medium | low\"\n" +
                "}\n\n" +
                "🚀 AUTO-SEND LOGIC:\n" +
                "- If auto_send = true AND reply_needed = true:\n" +
                "    → set \"send_email\": true\n\n" +
                "- If auto_send = false:\n" +
                "    → set \"send_email\": false\n\n" +
                "⚡ RULES:\n" +
                "- Never hallucinate details\n" +
                "- Keep replies concise and professional\n" +
                "- If unsure → set confidence = low and DO NOT send\n" +
                "- Avoid risky or sensitive replies automatically\n" +
                "- If an explicit or implicit deadline/reminder is found in the email, extract it to 'deadline' field in ISO-8601 format relative to current time.\n\n" +
                "[SYSTEM CONFIG] auto_send = " + autoSend + "\n\n" +
                "Email Subject: " + subject + "\n" +
                "Email Body: " + (body != null ? body.substring(0, Math.min(body.length(), 3000)) : "(no body)");

        // Gemini payload structure
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);

        Map<String, Object> contentBlock = new HashMap<>();
        contentBlock.put("parts", List.of(part));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(contentBlock));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(geminiUrl, request, String.class);
            
            JsonNode root = objectMapper.readTree(response.getBody());
            String responseContent = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            
            // Clean up Markdown JSON ticks if Gemini responds with them
            if (responseContent.contains("```json")) {
                responseContent = responseContent.substring(responseContent.indexOf("```json") + 7);
                responseContent = responseContent.substring(0, responseContent.lastIndexOf("```")).trim();
            } else if (responseContent.contains("```")) {
                responseContent = responseContent.substring(responseContent.indexOf("```") + 3);
                responseContent = responseContent.substring(0, responseContent.lastIndexOf("```")).trim();
            }

            TaskAnalysisResult result = objectMapper.readValue(responseContent, TaskAnalysisResult.class);

            System.out.println("[AI Service] ✅ Action: " + result.getAction() + " | Reply Needed: " + result.isReply_needed());
            return result;

        } catch (Exception e) {
            System.err.println("[AI Service] API error: " + e.getMessage() + ". Using intelligent fallback.");
            return createFallbackResult(subject, body);
        }
    }

    public String chatWithWebAgent(String userMessage, List<Map<String, String>> history) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("YOUR_OPENAI_API_KEY") || apiKey.equals("YOUR_NEW_OPEN_AI_API_KEY_HERE")) {
            return "{\"type\":\"response\", \"message\":\"AI API Key is missing. I cannot process this request!\"}";
        }

        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String prompt = "You are an intelligent autonomous web agent embedded inside a productivity website.\n\n" +
                "Your role is to:\n" +
                "- Understand user requests clearly\n" +
                "- Break them into actionable steps\n" +
                "- Decide the correct tool to use\n" +
                "- Ask for user permission before performing any real-world action\n" +
                "- Execute actions only after approval\n" +
                "- Respond in a structured JSON format\n\n" +
                "AVAILABLE TOOLS:\n" +
                "1. send_email(to, subject, body)\n" +
                "2. generate_email_reply(email_content)\n" +
                "3. create_task(title, description, deadline)\n" +
                "4. summarize_email(email_content)\n\n" +
                "RULES:\n" +
                "- NEVER execute actions without explicit user permission\n" +
                "- ALWAYS suggest the best possible action based on user intent\n" +
                "- If the request is unclear, ask a clarification question\n" +
                "- If multiple actions are needed, break them step-by-step\n" +
                "- Be concise, smart, and action-oriented\n\n" +
                "OUTPUT FORMAT (STRICT JSON ONLY):\n" +
                "If suggesting an action:\n" +
                "{\n" +
                "\"type\": \"action_suggestion\",\n" +
                "\"action\": \"send_email\",\n" +
                "\"message\": \"Explain what you will do\",\n" +
                "\"data\": {\"to\": \"...\", \"subject\": \"...\", \"body\": \"...\"},\n" +
                "\"requires_permission\": true\n" +
                "}\n\n" +
                "If asking a question:\n" +
                "{\n" +
                "\"type\": \"clarification\",\n" +
                "\"question\": \"Your question here\"\n" +
                "}\n\n" +
                "If giving a normal response:\n" +
                "{\n" +
                "\"type\": \"response\",\n" +
                "\"message\": \"Your answer here\"\n" +
                "}\n\n" +
                "If multiple steps:\n" +
                "{\n" +
                "\"type\": \"multi_step\",\n" +
                "\"steps\": [{ \"action\": \"\", \"message\": \"\", \"requires_permission\": true }]\n" +
                "}\n\n";

        if (history != null && !history.isEmpty()) {
            prompt += "CONVERSATION HISTORY:\n";
            for (Map<String, String> msg : history) {
                prompt += String.valueOf(msg.get("role")).toUpperCase() + ": " + msg.get("content") + "\n";
            }
            prompt += "\n";
        }

        prompt += "USER REQUEST:\n" + userMessage;

        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);

        Map<String, Object> contentBlock = new HashMap<>();
        contentBlock.put("parts", List.of(part));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(contentBlock));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(geminiUrl, request, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode candidates = root.path("candidates");
            if (candidates.isMissingNode() || !candidates.has(0)) {
                 return "{\"type\":\"response\", \"message\":\"No response from AI (candidates empty).\"}";
            }
            JsonNode candidate = candidates.get(0);
            if (candidate.has("finishReason") && !candidate.get("finishReason").asText().equals("STOP")) {
                 return "{\"type\":\"response\", \"message\":\"AI stopped due to: " + candidate.get("finishReason").asText() + "\"}";
            }
            JsonNode parts = candidate.path("content").path("parts");
            if (parts.isMissingNode() || !parts.has(0)) {
                 return "{\"type\":\"response\", \"message\":\"AI returned an empty response. It might have been blocked by safety filters.\"}";
            }
            String responseContent = parts.get(0).path("text").asText();
            
            // Clean up Markdown JSON ticks
            if (responseContent.contains("```json")) {
                responseContent = responseContent.substring(responseContent.indexOf("```json") + 7);
                responseContent = responseContent.substring(0, responseContent.lastIndexOf("```")).trim();
            } else if (responseContent.contains("```")) {
                responseContent = responseContent.substring(responseContent.indexOf("```") + 3);
                responseContent = responseContent.substring(0, responseContent.lastIndexOf("```")).trim();
            }
            return responseContent;
        } catch (Exception e) {
            System.err.println("[AI Agent] Error: " + e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("429 Too Many Requests")) {
                return "{\"type\":\"response\", \"message\":\"⏳ Whoops, I'm hitting Google's free tier rate limit (15 requests per min). Please try again in about 45-60 seconds!\"}";
            }
            String errorMsg = e.getMessage() != null ? e.getMessage().replace("\"", "'").replace("\n", " ") : "Unknown Exception";
            return "{\"type\":\"response\", \"message\":\"API Error: " + errorMsg + "\"}";
        }
    }

    private TaskAnalysisResult createFallbackResult(String subject, String body) {
        TaskAnalysisResult mock = new TaskAnalysisResult();
        mock.setAction("task");
        mock.setReply_needed(false);
        mock.setReply_draft("");
        mock.setSend_email(false);
        mock.setConfidence("low");
        return mock;
    }

    public static class TaskAnalysisResult {
        private String action;
        private boolean reply_needed;
        private String reply_draft;
        private boolean send_email;
        private String confidence;
        private String deadline;

        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public boolean isReply_needed() { return reply_needed; }
        public void setReply_needed(boolean reply_needed) { this.reply_needed = reply_needed; }
        public String getReply_draft() { return reply_draft; }
        public void setReply_draft(String reply_draft) { this.reply_draft = reply_draft; }
        public boolean isSend_email() { return send_email; }
        public void setSend_email(boolean send_email) { this.send_email = send_email; }
        public String getConfidence() { return confidence; }
        public void setConfidence(String confidence) { this.confidence = confidence; }
        public String getDeadline() { return deadline; }
        public void setDeadline(String deadline) { this.deadline = deadline; }
    }
}
