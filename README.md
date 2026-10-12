# Agentheek — Streaming AI Chat with Tools & Skills

A lightweight, high-performance conversational AI application built with **Next.js 14**, **React 18**, and **Google Gemini 2.0 Flash**. Messages stream token-by-token over Server-Sent Events (SSE), tools execute autonomously with live UI feedback cards, and modular markdown skills reshape how the assistant responds — either manually selected or automatically routed by the model.

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd agentheek
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Google Gemini API key:

```env
# Get your free key at https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB connection URI for persistent chat history (optional / local)
MONGODB_URI=mongodb://localhost:27017/agentheek
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✨ Features & Architecture

| Feature | Description | Implementation |
|---|---|---|
| **Token-by-Token Streaming** | Smooth, low-latency live response streaming. | Next.js App Router Route Handler using custom named Server-Sent Events (`token`, `tool_call`, `tool_result`, `skill_active`, `done`). |
| **Autonomous Tool Calling** | Gemini determines when external data is needed and invokes tools. | `get_weather` with real-time Open-Meteo meteorological feed and graceful simulation fallback; multi-turn continuation with Gemini. |
| **Modular Markdown Skills** | File-based prompt templates that transform model persona and output structure. | `.md` files in `/skills` dynamically discovered without database migrations or code restarts. |
| **Model Auto-Skill Selection** | The model identifies when a prompt requires a skill (e.g. generating code, reviewing PRs, planning lessons) and applies it automatically. | High-precision intent classifier with zero-temperature LLM classification fallback when ambiguous. |
| **Enhanced Code Blocks & Live HTML Sandbox** | Formatted code snippets with one-click copy and live interactive rendering. | Custom `ReactMarkdown` code renderer with language tags, copy feedback, and a live sandboxed `<iframe>` preview for HTML. |
| **Multimodal Image Input** | Analyze images alongside text. | Drag & drop or file upload, client & server validation (5 MB limit), encoded as inline base64 for Gemini vision. |
| **User Profiles & Chat Persistence** | Save conversations across sessions with in-place user profiles. | MongoDB collections for user handles and chat threads, paired with instant optimistic UI updates. |
| **Responsive Mobile Drawer** | Full accessibility on mobile devices. | Slide-out navigation drawer with blurred backdrop overlay and hamburger header toggle. |

---

## 🧠 Extensible Skills

Skills live in the `/skills` directory as plain Markdown files. The first `# Heading` becomes the display name, and the text defines the system instructions.

### Included Skills:
1. **Code Generator** (`skills/code-generator.md`): Architect producing complete, production-grade code with live HTML sandbox previews.
2. **Code Reviewer** (`skills/code-reviewer.md`): Senior software engineer review with categorized issues (critical, warnings, suggestions) and refactored snippets.
3. **Lesson Planner** (`skills/lesson-planner.md`): Pedagogical framework structured into Hook, Direct Instruction, Practice, and Assessment.

### Adding a New Skill:
1. Create `skills/your-skill-name.md`.
2. Write instructions in Markdown (e.g., `# SQL Expert\nYou write optimized queries...`).
3. The skill is instantly discovered by the `/api/skills` endpoint and auto-routed when relevant — **zero configuration required**.

---

## 🛠️ Design Decisions

### 1. Server-Sent Events (SSE) over WebSockets
SSE is unidirectional (server → client) and runs over standard HTTP/2 without extra protocol overhead or socket server dependencies. It natively maps to LLM streaming patterns and allows clean, named event dispatch (`token`, `tool_call`, `skill_active`, `error`).

### 2. Filesystem Markdown for Skills, Not Database Rows
Skills are treated as version-controllable code artifacts in the repository. Adding, editing, or testing a skill is as simple as creating a `.md` file in `/skills/`. This eliminates schema migrations and makes persona engineering transparent.

### 3. Hybrid Intent Classification for Auto-Skill Routing
To allow the model to pick skills without the user needing slash commands, we implemented a hybrid pipeline:
- **Instant Heuristic Matching**: High-precision semantic regexes detect code generation, code review, or lesson planning intents in **0ms with 0 extra API quota**.
- **LLM Classification Fallback**: For ambiguous prompts, a compact zero-temperature classification call classifies the query.
- **Visual Transparency**: When a skill is auto-activated, the UI renders an `Auto-routed` badge in the message stream so the user always understands why a specific persona was adopted.

### 4. Sandboxed In-Chat HTML Previews
When generating web code (HTML/CSS/JS), reading raw markup alone is limiting. We implemented a toggleable, sandboxed `<iframe>` preview inside the assistant message bubble (`sandbox="allow-scripts"`). Users can view the syntax-highlighted code, copy it with one click, or instantly preview the interactive output.

### 5. Vanilla CSS Design System (No Framework Bloat)
Instead of importing heavyweight utility frameworks, the interface uses a tailored CSS custom property design system (`app/globals.css`) with:
- **Curated Typography**: [Figtree](https://fonts.google.com/specimen/Figtree) for clean UI reading and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for code blocks.
- **Cohesive Vector Iconography**: Pure inline SVGs for avatars, tools, skills, and composer actions.
- **Themed Browser Surfaces**: Custom selection highlights, themed text carets, and visible keyboard `:focus-visible` rings.

---

## 🚀 What I'd Improve With More Time

1. **Multi-File Code Sandbox & ZIP Export**: Allow the Code Generator skill to output multiple connected files (HTML + CSS + JS) with a one-click download button.
2. **Dynamic Tools Directory (`/tools`)**: Extend the filesystem auto-discovery pattern used for skills to custom tools, allowing developers to drop a `.js` tool file that registers parameters and handlers automatically.
3. **Server-Side Stream Abort**: Currently, the client aborts the fetch stream via `AbortController`. Passing the `AbortSignal` directly into `@google/genai` would terminate upstream token generation immediately on the server when a user hits Stop.
4. **OAuth Authentication**: Complement the current lightweight MongoDB username system with NextAuth.js for GitHub and Google sign-in.
5. **Full Syntax Highlighting & Diff View**: Integrate Shiki or Prism with server-side caching and a visual side-by-side diff view for the Code Reviewer skill.
6. **Automated End-to-End Test Suite**: Add Playwright E2E tests covering SSE stream continuity, tool execution cards, and mobile drawer transitions.

---

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI & Components**: React 18, Vanilla CSS Design System
- **AI Model**: Google Gemini 2.0 Flash via `@google/genai`
- **Markdown & Code**: `react-markdown` + `remark-gfm`
- **Database**: MongoDB (Native Driver)
