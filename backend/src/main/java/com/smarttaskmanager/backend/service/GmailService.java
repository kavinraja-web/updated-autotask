package com.smarttaskmanager.backend.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class GmailService {

    private static final String APPLICATION_NAME = "Smart Auto Task Manager";
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    public List<EmailDto> getRecentEmails(String userAccessToken) {
        List<EmailDto> emails = new ArrayList<>();

        if (userAccessToken == null || userAccessToken.isBlank() || userAccessToken.equals("mock-token")) {
            System.out.println("[GmailService] No valid access token provided. Skipping Gmail scan.");
            return emails;
        }

        try {
            // Build Gmail client using the stored OAuth2 access token
            HttpRequestInitializer requestInitializer = request -> {
                request.getHeaders().setAuthorization("Bearer " + userAccessToken);
            };

            Gmail gmail = new Gmail.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JSON_FACTORY,
                    requestInitializer)
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            // Fetch up to 500 recent emails from the last 48 hours (to be safe for
            // "recent")
            ListMessagesResponse response = gmail.users().messages()
                    .list("me")
                    .setQ("newer_than:2d -label:spam -label:trash")
                    .setMaxResults(500L)
                    .execute();

            if (response.getMessages() == null || response.getMessages().isEmpty()) {
                System.out.println("[GmailService] No unread emails found.");
                return emails;
            }

            for (Message msgRef : response.getMessages()) {
                try {
                    Message fullMessage = gmail.users().messages()
                            .get("me", msgRef.getId())
                            .setFormat("full")
                            .execute();

                    String subject = extractHeader(fullMessage, "Subject");
                    String from = extractHeader(fullMessage, "From");
                    String snippet = fullMessage.getSnippet();
                    String body = extractBody(fullMessage);

                    emails.add(new EmailDto(
                            fullMessage.getId(),
                            subject != null ? subject : "(No Subject)",
                            from != null ? from : "Unknown Sender",
                            snippet != null ? snippet : "",
                            body != null ? body : snippet));
                } catch (Exception e) {
                    System.err
                            .println("[GmailService] Error fetching message " + msgRef.getId() + ": " + e.getMessage());
                }
            }

            System.out.println("[GmailService] Fetched " + emails.size() + " recent emails from the last 48h.");
        } catch (Exception e) {
            System.err.println("[GmailService] Gmail API call failed: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Gmail authentication or API call failed. " + e.getMessage(), e);
        }

        return emails;
    }

    private String extractHeader(Message message, String headerName) {
        if (message.getPayload() == null || message.getPayload().getHeaders() == null)
            return null;
        for (MessagePartHeader header : message.getPayload().getHeaders()) {
            if (headerName.equalsIgnoreCase(header.getName())) {
                return header.getValue();
            }
        }
        return null;
    }

    private String extractBody(Message message) {
        if (message.getPayload() == null)
            return null;
        return extractTextFromPart(message.getPayload());
    }

    private String extractTextFromPart(MessagePart part) {
        if ("text/plain".equals(part.getMimeType()) && part.getBody() != null && part.getBody().getData() != null) {
            return new String(Base64.getUrlDecoder().decode(part.getBody().getData()), StandardCharsets.UTF_8);
        }
        // Fallback to text/html if plain text is not available
        if ("text/html".equals(part.getMimeType()) && part.getBody() != null && part.getBody().getData() != null) {
            return new String(Base64.getUrlDecoder().decode(part.getBody().getData()), StandardCharsets.UTF_8);
        }
        if (part.getParts() != null) {
            for (MessagePart subPart : part.getParts()) {
                String text = extractTextFromPart(subPart);
                if (text != null)
                    return text;
            }
        }
        return null;
    }

    public static class EmailDto {
        private String id;
        private String subject;
        private String from;
        private String snippet;
        private String body;

        public EmailDto(String id, String subject, String from, String snippet, String body) {
            this.id = id;
            this.subject = subject;
            this.from = from;
            this.snippet = snippet;
            this.body = body;
        }

        public String getId() {
            return id;
        }

        public String getSubject() {
            return subject;
        }

        public String getFrom() {
            return from;
        }

        public String getSnippet() {
            return snippet;
        }

        public String getBody() {
            return body;
        }
    }

    public void sendEmail(String userAccessToken, String to, String subject, String bodyText) {
        if (userAccessToken == null || userAccessToken.isBlank() || userAccessToken.equals("mock-token")) {
            System.out.println("[GmailService] No valid access token provided. Mock sending email.");
            return;
        }

        try {
            HttpRequestInitializer requestInitializer = request -> {
                request.getHeaders().setAuthorization("Bearer " + userAccessToken);
            };

            Gmail gmail = new Gmail.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JSON_FACTORY,
                    requestInitializer)
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            String rawMessage = "To: " + to + "\r\n" +
                                "Subject: " + subject + "\r\n" +
                                "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
                                bodyText;
            String encodedEmail = Base64.getUrlEncoder().encodeToString(rawMessage.getBytes(StandardCharsets.UTF_8));
            
            Message message = new Message();
            message.setRaw(encodedEmail);
            
            gmail.users().messages().send("me", message).execute();
            System.out.println("[GmailService] Successfully sent email to " + to);
            
        } catch (Exception e) {
            System.err.println("[GmailService] Gmail send API call failed: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to send email via Gmail API", e);
        }
    }
}
