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

    // Key 1: Voice Assistant
    @Value("${gemini.api.key.voice}")
    private String geminiVoiceApiKey;

    // Key 2: Chatbot / Web Agent (Now OpenAI)
    @Value("${openai.api.key.chat}")
    private String openaiChatApiKey;

    // Key 3: Task Generation & Reminder Analysis (Now OpenRouter)
    @Value("${openrouter.api.key.task}")
    private String openrouterTaskApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Shared Gemini REST helper ────────────────────────────────────────────
    private String callGeminiApi(String apiKey, String prompt) throws Exception {
        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);

        Map<String, Object> contentBlock = new HashMap<>();
        contentBlock.put("parts", List.of(part));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(contentBlock));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(geminiUrl, request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidates = root.path("candidates");
        if (candidates.isMissingNode() || !candidates.has(0)) {
            throw new Exception("No candidates returned from Gemini API");
        }
        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (parts.isMissingNode() || !parts.has(0)) {
            throw new Exception("Empty parts from Gemini API");
        }
        return parts.get(0).path("text").asText();
    }

    // ─── Clean up Markdown JSON fences ───────────────────────────────────────
    private String stripMarkdownJson(String text) {
        if (text.contains("```json")) {
            text = text.substring(text.indexOf("```json") + 7);
            text = text.substring(0, text.lastIndexOf("```")).trim();
        } else if (text.contains("```")) {
            text = text.substring(text.indexOf("```") + 3);
            text = text.substring(0, text.lastIndexOf("```")).trim();
        }
        return text;
    }

    // ─── Shared OpenRouter REST helper ────────────────────────────────────────────
    private String callOpenRouterApi(String apiKey, String prompt) throws Exception {
        String url = "https://openrouter.ai/api/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("HTTP-Referer", "http://localhost:5173");
        headers.set("X-Title", "SmartTask AI");

        java.util.ArrayList<Map<String, String>> messages = new java.util.ArrayList<>();
        messages.add(Map.of("role", "user", "content", prompt));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("messages", messages);

        String[] fallbackModels = {
            "google/gemini-2.0-flash:free",
            "meta-llama/llama-3-8b-instruct:free",
            "qwen/qwen-2-7b-instruct:free",
            "mistralai/mistral-7b-instruct:free",
            "google/gemma-2-9b-it:free"
        };

        Exception lastException = null;
        for (String model : fallbackModels) {
            try {
                requestBody.put("model", model);
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isMissingNode() || !choices.has(0)) {
                    throw new Exception("No choices returned");
                }
                System.out.println("[OpenRouter] ✅ Success using model: " + model);
                return choices.get(0).path("message").path("content").asText();
            } catch (Exception e) {
                System.err.println("[OpenRouter] ⚠️ Model '" + model + "' failed: " + e.getMessage() + ". Trying next fallback...");
                lastException = e;
            }
        }
        
        throw new Exception("All OpenRouter fallback models failed. Last error: " + (lastException != null ? lastException.getMessage() : "Unknown"));
    }

    // ─── Shared OpenAI REST helper with Auto-Retry ────────────────────────────
    private String callOpenAiApi(String apiKey, String systemPrompt, List<Map<String, String>> history, String userMessage) throws Exception {
        String url = "https://api.openai.com/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        java.util.ArrayList<Map<String, String>> messages = new java.util.ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (history != null) {
            for (Map<String, String> msg : history) {
                String role = msg.get("role") != null && msg.get("role").equalsIgnoreCase("assistant") ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", msg.get("content")));
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-4o-mini"); 
        requestBody.put("messages", messages);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        int maxRetries = 2;
        for (int i = 0; i <= maxRetries; i++) {
            try {
                ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isMissingNode() || !choices.has(0)) {
                    throw new Exception("No choices returned from OpenAI API");
                }
                return choices.get(0).path("message").path("content").asText();
            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                if (i == maxRetries || e.getResponseBodyAsString().contains("quota")) {
                    throw new Exception("429 Too Many Requests: Quota exceeded or rate limit persistent.");
                }
                System.out.println("[AI Chat] Hit OpenAI 3 RPM rate limit. Waiting 20 seconds before retry...");
                Thread.sleep(20000); // Wait 20 seconds to overcome free tier limits
            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("429") && !e.getMessage().contains("quota")) {
                    if (i == maxRetries) throw e;
                    System.out.println("[AI Chat] Hit OpenAI rate limit. Waiting 20 seconds before retry...");
                    Thread.sleep(20000);
                } else {
                    throw e;
                }
            }
        }
        throw new Exception("Failed after retries");
    }

    // ─── 1. Task Generation & Reminder Analysis (Key 3 - OpenRouter) ─────────
    public TaskAnalysisResult analyzeEmailForTask(String subject, String body, boolean autoSend) {
        if (openrouterTaskApiKey == null || openrouterTaskApiKey.isBlank() || openrouterTaskApiKey.equals("YOUR_TASK_GEMINI_API_KEY")) {
            System.out.println("[AI Service] No task API key set. Using Smart Heuristic Fallback.");
            return createFallbackResult(subject, body);
        }

        System.out.println("[AI Service] Analyzing email via OpenRouter Task API: " + subject);

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
                "  \"summary\": \"Short 1-2 sentence summary of the email context\",\n" +
                "  \"priority\": \"High | Medium | Low\",\n" +
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

        try {
            String responseContent = callOpenRouterApi(openrouterTaskApiKey, prompt);
            responseContent = stripMarkdownJson(responseContent);
            TaskAnalysisResult result = objectMapper.readValue(responseContent, TaskAnalysisResult.class);
            System.out.println("[AI Service] ✅ Action: " + result.getAction() + " | Reply Needed: " + result.isReply_needed());
            return result;
        } catch (Exception e) {
            System.err.println("[AI Service] Task API error: " + e.getMessage() + ". Using intelligent fallback.");
            return createFallbackResult(subject, body);
        }
    }

    // ─── 1.5. On-Demand Email Reply Generation ──────────────────────────────
    public String generateEmailReply(String subject, String body) {
        String safeBody = body != null ? body.substring(0, Math.min(body.length(), 3500)) : "(No Body)";
        String prompt = "You are an elite executive assistant drafting an email reply on behalf of the user.\n\n" +
                "ORIGINAL EMAIL RECEIVED:\n" +
                "Subject: " + subject + "\n" +
                "Body: " + safeBody + "\n\n" +
                "INSTRUCTIONS:\n" +
                "1. Read the original email carefully and identify its main purpose, tone, and any specific questions or requests.\n" +
                "2. Write a highly tailored, comprehensive, and professional reply that directly addresses the sender's points.\n" +
                "3. Use a standard business email structure: greeting, body paragraphs, and a professional sign-off.\n" +
                "4. If the original email requires scheduling or confirmation, draft the response to politely suggest availability or acknowledge receipt enthusiastically.\n" +
                "5. Do NOT just write 'Thank you for your email.' Provide a substantial and meaningful response based on the context.\n" +
                "6. Provide ONLY the raw text of the email reply. Do not wrap in JSON, markdown blocks, or add extra commentary.";

        try {
            // Try OpenRouter first if available
            if (openrouterTaskApiKey != null && !openrouterTaskApiKey.isBlank() && !openrouterTaskApiKey.contains("YOUR_KEY_HERE")) {
                try {
                    return callOpenRouterApi(openrouterTaskApiKey, prompt);
                } catch (Exception e) {
                    System.err.println("[AI Service] OpenRouter failed for reply: " + e.getMessage() + ". Falling back to OpenAI.");
                    return callOpenAiApi(openaiChatApiKey, prompt, new java.util.ArrayList<>(), "Generate reply");
                }
            } else {
                return callOpenAiApi(openaiChatApiKey, prompt, new java.util.ArrayList<>(), "Generate reply");
            }
        } catch (Exception e) {
            System.err.println("[AI Service] Reply Generation failed completely: " + e.getMessage());
            return "Thank you for your email. I have received it and will get back to you shortly.\n\nBest regards,\n\n[Auto-generated placeholder - AI API limits reached]";
        }
    }

    // ─── 2. Chatbot / Web Agent (Key 2 - Now using OpenAI) ──────────────────────
    public String chatWithWebAgent(String userMessage, List<Map<String, String>> history) {
        if (openaiChatApiKey == null || openaiChatApiKey.isBlank() || openaiChatApiKey.equals("YOUR_CHAT_GEMINI_API_KEY")) {
            return "{\"type\":\"response\", \"message\":\"OpenAI API Key is missing. Please set your key in application.properties!\"}";
        }

        String systemPrompt = "You are an intelligent autonomous web agent embedded inside a productivity website.\n\n" +
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
                "}\n";

        try {
            String responseContent = callOpenAiApi(openaiChatApiKey, systemPrompt, history, userMessage);
            responseContent = stripMarkdownJson(responseContent);
            return responseContent;
        } catch (Exception e) {
            System.err.println("[AI Chat] Error: " + e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("429")) {
                if (e.getMessage().contains("Quota")) {
                    return "{\"type\":\"response\", \"message\":\"⏳ OpenAI Error: You have exceeded your account quota. Please check your billing details!\"}";
                }
                return "{\"type\":\"response\", \"message\":\"⏳ Whoops, rate limit hit on OpenAI API. Please try again in a minute!\"}";
            }
            String errorMsg = e.getMessage() != null ? e.getMessage().replace("\"", "'").replace("\n", " ") : "Unknown Exception";
            return "{\"type\":\"response\", \"message\":\"API Error: " + errorMsg + "\"}";
        }
    }

    // ─── 3. Voice Assistant AI (Key 1) ───────────────────────────────────────
    public String chatWithVoiceAgent(String userMessage, List<Map<String, String>> history) {
        if (geminiVoiceApiKey == null || geminiVoiceApiKey.isBlank() || geminiVoiceApiKey.equals("YOUR_VOICE_GEMINI_API_KEY")) {
            return "{\"type\":\"response\", \"message\":\"Voice AI key is missing. Please set GEMINI_API_KEY_VOICE in application.properties!\"}";
        }

        String prompt = "You are a friendly, concise voice AI assistant for a productivity app called SmartTask.\n" +
                "The user is speaking to you via voice. Keep your responses SHORT and conversational (1-2 sentences max).\n" +
                "You help users with tasks, emails, habits, and reminders.\n\n" +
                "OUTPUT FORMAT (STRICT JSON):\n" +
                "{\n" +
                "  \"type\": \"response\",\n" +
                "  \"message\": \"Your short spoken reply here\"\n" +
                "}\n\n";

        if (history != null && !history.isEmpty()) {
            prompt += "CONVERSATION HISTORY:\n";
            for (Map<String, String> msg : history) {
                prompt += String.valueOf(msg.get("role")).toUpperCase() + ": " + msg.get("content") + "\n";
            }
            prompt += "\n";
        }

        prompt += "USER SAID: " + userMessage;

        try {
            String responseContent = callGeminiApi(geminiVoiceApiKey, prompt);
            responseContent = stripMarkdownJson(responseContent);
            return responseContent;
        } catch (Exception e) {
            System.err.println("[AI Voice] Error: " + e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("429")) {
                return "{\"type\":\"response\", \"message\":\"Rate limit hit. Please try again shortly.\"}";
            }
            return "{\"type\":\"response\", \"message\":\"Sorry, I couldn't connect to the AI right now.\"}";
        }
    }

    // ─── Fallback ─────────────────────────────────────────────────────────────
    private TaskAnalysisResult createFallbackResult(String subject, String body) {
        TaskAnalysisResult mock = new TaskAnalysisResult();
        mock.setAction("task");
        mock.setReply_needed(false);
        mock.setReply_draft("");
        mock.setSend_email(false);
        mock.setConfidence("low");
        return mock;
    }

    // ─── DTO ──────────────────────────────────────────────────────────────────
    public static class TaskAnalysisResult {
        private String action;
        private boolean reply_needed;
        private String reply_draft;
        private boolean send_email;
        private String confidence;
        private String deadline;
        private String summary;
        private String priority;

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
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
    }
}
