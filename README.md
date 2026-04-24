# Smart Auto Task Manager

A full-stack application that intelligently extracts actionable tasks from your Gmail inbox using AI, displayed on a stunning, modern glassmorphism React dashboard.

## Tech Stack
- **Frontend**: React.js (Vite), React Router, Lucide Icons, Vanilla CSS (Glassmorphism & Dark Mode)
- **Backend**: Spring Boot 3, Spring Data JPA, Spring Security (OAuth2 Resource Server)
- **Database**: MySQL
- **Integrations**: Gmail API, OpenAI API

## Prerequisites
- Node.js (v18+)
- Java 17+
- Maven
- MySQL Server (running on localhost:3306)

## Setup Instructions

### 1. Database Setup
Ensure you have MySQL running locally.
Create a database named `smart_task_manager`:
```sql
CREATE DATABASE smart_task_manager;
```
The application connects using username `root` and password `password`. Modify `backend/src/main/resources/application.properties` if your local MySQL credentials differ.

### 2. Backend Configuration
1. Open `backend/src/main/resources/application.properties`
2. Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with your actual Google Cloud OAuth 2.0 Client credentials. 
3. Replace `YOUR_OPENAI_API_KEY` with your OpenAI API base key.

### 3. Running the Backend
Navigate to the `backend` directory and run:
```bash
cd backend
mvn spring-boot:run
```
The server will start on `http://localhost:8080`.

### 4. Running the Frontend
Navigate to the `frontend` directory, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`. 
Note: Before starting, replace `YOUR_GOOGLE_CLIENT_ID` in `frontend/src/main.jsx` with your Google Client ID if you wish to test real authentication.

## Features
- **Intelligent Processing**: Automatically reads unread emails, parses them with GPT-3.5, and generates tasks.
- **Modern Dashboard**: View critical metrics, newly extracted tasks, and parsed emails in an Asana/Trello-like UI.
- **Priority Detection**: High, Medium, and Low priorities are auto-assigned by the AI based on urgency.
- **Celebration Mode**: Striking off a completed task throws confetti to celebrate your productivity!
