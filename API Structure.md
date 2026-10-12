# Agentheek — API Architecture & Endpoint Specification

This document provides a comprehensive specification of all backend REST endpoints and Server-Sent Event (SSE) streams in **Agentheek**.

---

## Architecture Overview

Agentheek uses **Next.js 14 App Router** running on **Node.js**.

- **Base URL**: `/api`
- **Data Persistence**: MongoDB (Native Driver)
- **Streaming Protocol**: HTTP Server-Sent Events (`text/event-stream`)
- **AI Engine**: Google Gen AI SDK (`gemini-3.6-flash`)

```
               ┌───────────────┐
               │  Next.js App  │
               └───────┬───────┘
                       │
       ┌───────────────┼───────────────┬────────────────┐
       ▼               ▼               ▼                ▼
 /api/auth        /api/chats      /api/skills       /api/chat
 (MongoDB)        (MongoDB)       (Filesystem)     (Gemini SSE)
```

---

## 1. Authentication & User Profile (`/api/auth`)

Manages unique username accounts and identity mapping without passwords.

### `GET /api/auth`
Check if a username exists or fetch basic profile metadata.

- **Query Parameters**:
  | Param | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `username` | String | Yes | Unique handle (2–30 chars, alphanumeric, `_`, `-`) |

- **Response `200 OK` (User Exists)**:
  ```json
  {
    "exists": true,
    "user": {
      "username": "alex_dev",
      "createdAt": "2026-10-12T07:15:00.000Z"
    }
  }
  ```

- **Response `404 Not Found` (New User)**:
  ```json
  {
    "exists": false,
    "username": "new_guest"
  }
  ```

---

### `POST /api/auth`
Login or auto-register a unique username.

- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "username": "alex_dev"
  }
  ```

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "user": {
      "username": "alex_dev",
      "createdAt": "2026-10-12T07:15:00.000Z"
    }
  }
  ```

- **Response `400 Bad Request`**:
  ```json
  {
    "error": "Username must be 2-30 characters and contain only letters, numbers, hyphens, or underscores"
  }
  ```

---

### `PUT /api/auth`
Rename a username and cascade-update all associated chats in MongoDB.

- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "oldUsername": "alex_old",
    "newUsername": "alex_new"
  }
  ```

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "username": "alex_new",
    "updatedChatsCount": 5
  }
  ```

- **Response `409 Conflict` (Username Taken)**:
  ```json
  {
    "error": "Username \"alex_new\" is already taken. Please choose another."
  }
  ```

---

## 2. Chat Sessions (`/api/chats`)

Provides persistent conversation session storage per user in MongoDB.

### `GET /api/chats`
Retrieve all chat sessions for a user, sorted newest first.

- **Query Parameters**:
  | Param | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `username` | String | Yes | Username handle |

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "chats": [
      {
        "id": "chat-1728723600000",
        "username": "alex_dev",
        "title": "Weather in London & Forecast",
        "messages": [
          { "role": "user", "content": "What's the weather in London?" },
          { "role": "assistant", "content": "The current weather is 14°C..." }
        ],
        "history": [
          { "role": "user", "content": "What's the weather in London?" },
          { "role": "assistant", "content": "The current weather is 14°C..." }
        ],
        "activeSkill": null,
        "updatedAt": 1728723650000
      }
    ]
  }
  ```

---

### `POST /api/chats`
Upsert (create or update) a chat session.

- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "username": "alex_dev",
    "session": {
      "id": "chat-1728723600000",
      "title": "HTML Generator",
      "messages": [...],
      "history": [...],
      "activeSkill": "code-generator",
      "updatedAt": 1728723650000
    }
  }
  ```

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "chat": { ... }
  }
  ```

---

### `DELETE /api/chats`
Delete a chat session.

- **Query Parameters**:
  | Param | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `username` | String | Yes | Owner username |
  | `id` | String | Yes | Session ID (e.g. `chat-1728723600000`) |

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "deletedId": "chat-1728723600000"
  }
  ```

---

## 3. Skills Discovery (`/api/skills`)

Discovers and inspects modular skills stored as markdown files in `/skills/*.md`.

### `GET /api/skills`
List available skills with title and short description.

- **Response `200 OK`**:
  ```json
  {
    "skills": [
      {
        "name": "code-generator",
        "displayName": "Code Generator Skill",
        "description": "Specialized senior architect generating clean, production-ready code with live HTML previews"
      },
      {
        "name": "code-reviewer",
        "displayName": "Code Reviewer Skill",
        "description": "Performs rigorous security, architectural, and syntax audits"
      },
      {
        "name": "lesson-planner",
        "displayName": "Lesson Planner Skill",
        "description": "Structured curriculum and pedagogy designer"
      }
    ]
  }
  ```

---

## 4. Streaming AI Chat (`/api/chat`)

Primary inference endpoint streaming real-time tokens, function calls, and skill banners via **Server-Sent Events (SSE)**.

### `POST /api/chat`

- **Formats Supported**:
  1. `application/json`: Text-only multi-turn chat.
  2. `multipart/form-data`: Multimodal prompts with image attachments (JPEG, PNG, GIF, WebP up to 5 MB).

- **Payload Fields**:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `messages` | Array / JSON string | Yes | Array of `{ role: 'user' \| 'assistant', content: string }` |
  | `skill` | String | Optional | Skill ID to force (e.g. `code-generator`). If omitted, auto-routes based on intent |
  | `image` | File | Optional | Image binary for vision analysis (`multipart/form-data` only) |

- **Response Headers**:
  ```http
  Content-Type: text/event-stream; charset=utf-8
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  ```

---

### Server-Sent Events (SSE) Stream Protocol

During the lifecycle of a request, the server emits lines formatted as:
```
event: <eventType>
data: <jsonPayload>
```

#### Event Reference

| Event Name | Description | Data Structure |
| :--- | :--- | :--- |
| `token` | Incremental chunk of generated text | `{"text": "Hello"}` |
| `skill_active` | Notifies client of active skill (manual or auto-routed) | `{"skill": "code-generator", "displayName": "Code Generator Skill", "autoDetected": true}` |
| `tool_call` | Model initiates tool invocation | `{"name": "get_weather", "args": {"city": "London"}}` |
| `tool_result` | Backend execution result of the tool | `{"name": "get_weather", "result": {"temperature": "14°C", "condition": "Cloudy", ...}}` |
| `tool_error` | Tool invocation failed | `{"name": "get_weather", "message": "Failed to fetch"}` |
| `warning` | Non-fatal advisory message | `{"message": "Skill not found, defaulting to base model"}` |
| `done` | Stream completed successfully | `{"fullText": "Full accumulated response"}` |
| `error` | Generation or stream failure | `{"code": "STREAM_BROKEN", "message": "...", "partialContent": "..."}` |

---

## 5. Built-in Tools (Function Calling)

### `get_weather(city)`
- **Trigger**: Model calls automatically whenever queries mention climate, weather, or temperatures for any location.
- **Provider**: Live meteorological query via Open-Meteo Geocoding & Forecast APIs.
- **Data Returned**:
  ```json
  {
    "city": "London, United Kingdom",
    "temperature": "14°C",
    "apparent_temperature": "12°C",
    "condition": "Cloudy",
    "humidity": "78%",
    "wind": "12 km/h",
    "coordinates": "51.51°, -0.13°",
    "source": "Live Open-Meteo Meteorological Feed",
    "durationMs": 312,
    "timestamp": "2026-10-12T07:30:00.000Z"
  }
  ```
