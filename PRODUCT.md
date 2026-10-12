# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
End users and general consumers seeking an everyday conversational AI assistant with pre-built workflow skills to help them learn, write, analyze, and accomplish daily tasks with ease.

## Product Purpose
Agentheek is a streaming conversational AI assistant powered by Google Gemini 2.0 Flash. It makes advanced AI capabilities—such as autonomous tool execution and modular markdown-driven skills—intuitive, transparent, and immediately accessible in an everyday chat environment. Success means smooth, low-latency streaming interactions where tool calls and specialized skills activate seamlessly during natural dialogue.

## Positioning
Rich multi-modal workflows with transparent autonomy: Unlike rigid chatbots or bloated agent frameworks, Agentheek provides lightweight, direct Server-Sent Events (SSE) streaming with autonomous multi-turn tool calling (e.g., weather lookups) and markdown-defined skills that reshape assistant persona and behavior on demand.

## Operating Context
- Responsive web application accessed across desktop and mobile browsers.
- Daily driver conversational interface: sidebar for thread management and quick skill switching, message timeline with live tool cards, and a multi-modal composer for text and image uploads.

## Capabilities and Constraints
- **Capabilities**:
  - Live token-by-token streaming via SSE route handlers.
  - Autonomous multi-turn function calling with visual UI state cards (call → result → continued synthesis).
  - Modular skill discovery from markdown files (`/skills`), switchable via slash commands or sidebar.
  - Image input upload with client and server validation (up to 5 MB inline data).
  - Thread persistence and authentication backed by MongoDB.
  - Client stream cancellation via `AbortController`.
  - Rich markdown formatting with code blocks, tables, and lists.
- **Constraints**:
  - Stack: Next.js 14 (App Router), React 18, Vanilla CSS (no Tailwind), `@google/genai` SDK, MongoDB.
  - Runtime: Modern web browsers, JavaScript (no TypeScript).

## Brand Commitments
- Name: **Agentheek** ("Streaming AI Chat with Tools & Skills").
- Interface personality: Modern, responsive, clean, and helpful with clear operational feedback during AI actions.

## Evidence on Hand
- Full runnable web application under `app/`, `components/`, and `lib/`.
- Active skills in `skills/` (`code-reviewer.md`, `lesson-planner.md`).
- Tool execution pipeline implemented in `app/api/chat/route.js`.
- No marketing testimonials, fabricated benchmarks, or artificial customer logos.

## Product Principles
1. **Live Transparency**: Tool invocations, streaming progress, and skill state changes are explicitly rendered so users always understand what the model is doing.
2. **Effortless Extensibility**: Skills and tools remain cleanly decoupled, making additions as simple as dropping a markdown file or declaring a function.
3. **Conversational Fluidity**: Low latency, graceful error handling, and responsive controls (like mid-stream stop) ensure a reliable, interruption-free user experience.
4. **Lightweight Precision**: Clean vanilla styles and direct SDK integration prioritize fast load times, clear code architecture, and unbloated dependencies.
