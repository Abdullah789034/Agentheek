import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// ─── Configuration ────────────────────────────────────────────────────────────
const MODEL_ID = "gemini-3.6-flash";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Tool definitions ─────────────────────────────────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description:
          "Returns current weather conditions for a given city. Call this whenever the user asks about weather, temperature, or climate in any city.",
        parameters: {
          type: "OBJECT",
          properties: {
            city: {
              type: "STRING",
              description: "The name of the city to get weather for.",
            },
          },
          required: ["city"],
        },
      },
    ],
  },
];

// ─── Real weather implementation with fallback ────────────────────────────────
async function get_weather(city = "London") {
  const startTime = Date.now();
  const cleanCity = String(city).trim();

  // 1. Try real-time live meteorological data from Open-Meteo (free, no API key needed)
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cleanCity
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
    const geoData = await geoRes.json();

    if (geoData.results && geoData.results.length > 0) {
      const { latitude, longitude, name, country } = geoData.results[0];
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
      const weatherRes = await fetch(weatherUrl, {
        signal: AbortSignal.timeout(4000),
      });
      const weatherData = await weatherRes.json();

      if (weatherData.current) {
        const cur = weatherData.current;
        const conditionMap = {
          0: "Clear sky",
          1: "Mainly clear",
          2: "Partly cloudy",
          3: "Overcast",
          45: "Fog",
          48: "Depositing rime fog",
          51: "Light drizzle",
          53: "Moderate drizzle",
          55: "Dense drizzle",
          61: "Slight rain",
          63: "Moderate rain",
          65: "Heavy rain",
          71: "Slight snow",
          73: "Moderate snow",
          75: "Heavy snow",
          80: "Slight rain showers",
          81: "Moderate rain showers",
          82: "Violent rain showers",
          95: "Thunderstorm",
        };
        const condition = conditionMap[cur.weather_code] || "Partly cloudy";

        return {
          city: country ? `${name}, ${country}` : name,
          temperature: `${Math.round(cur.temperature_2m)}°C`,
          apparent_temperature: `${Math.round(cur.apparent_temperature)}°C`,
          condition,
          humidity: `${Math.round(cur.relative_humidity_2m)}%`,
          wind: `${Math.round(cur.wind_speed_10m)} km/h`,
          coordinates: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          source: "Live Open-Meteo Meteorological Feed",
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("Live weather fetch failed, falling back to mock:", err.message);
  }

  // 2. High-fidelity mocked fallback
  const weatherData = {
    london: { temp: 14, condition: "Cloudy", humidity: 78, wind: "12 km/h W" },
    "new york": {
      temp: 22,
      condition: "Sunny",
      humidity: 55,
      wind: "8 km/h NE",
    },
    tokyo: { temp: 28, condition: "Partly Cloudy", humidity: 70, wind: "5 km/h S" },
    paris: { temp: 18, condition: "Light Rain", humidity: 82, wind: "15 km/h NW" },
    dubai: { temp: 38, condition: "Clear", humidity: 40, wind: "10 km/h N" },
    sydney: { temp: 21, condition: "Sunny", humidity: 60, wind: "20 km/h SE" },
    berlin: { temp: 12, condition: "Overcast", humidity: 80, wind: "18 km/h W" },
    mumbai: { temp: 32, condition: "Humid", humidity: 90, wind: "7 km/h SW" },
    toronto: { temp: 9, condition: "Snowy", humidity: 75, wind: "25 km/h N" },
    singapore: {
      temp: 30,
      condition: "Thunderstorms",
      humidity: 88,
      wind: "4 km/h variable",
    },
  };

  const key = cleanCity.toLowerCase();
  const matchedKey = Object.keys(weatherData).find(
    (k) => key.includes(k) || k.includes(key)
  );
  const data = (matchedKey && weatherData[matchedKey]) || {
    temp: Math.round(15 + Math.random() * 15),
    condition: ["Sunny", "Cloudy", "Windy", "Partly Cloudy"][
      Math.floor(Math.random() * 4)
    ],
    humidity: Math.round(50 + Math.random() * 40),
    wind: `${Math.round(5 + Math.random() * 25)} km/h`,
  };

  return {
    city: cleanCity,
    temperature: `${data.temp}°C`,
    apparent_temperature: `${data.temp - 2}°C`,
    condition: data.condition,
    humidity: `${data.humidity}%`,
    wind: data.wind,
    source: "Simulated Meteorological Engine",
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

// ─── Skill loader ─────────────────────────────────────────────────────────────
function loadSkill(skillName) {
  try {
    const skillsDir = path.join(process.cwd(), "skills");
    const skillFile = path.join(skillsDir, `${skillName}.md`);

    if (!fs.existsSync(skillFile)) {
      return null;
    }

    const content = fs.readFileSync(skillFile, "utf-8");
    return content;
  } catch (err) {
    console.error("Error loading skill:", err);
    return null;
  }
}

function getAvailableSkills() {
  try {
    const skillsDir = path.join(process.cwd(), "skills");
    if (!fs.existsSync(skillsDir)) return [];
    const files = fs.readdirSync(skillsDir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const name = f.replace(".md", "");
        const content = fs.readFileSync(path.join(skillsDir, f), "utf-8");
        const match = content.match(/^#\s+(.+)/m);
        const displayName = match ? match[1].trim() : name;
        const textLines = content
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"));
        const description = textLines.length > 0 ? textLines[0].slice(0, 120) : "";
        return { name, displayName, description, content };
      });
  } catch (err) {
    return [];
  }
}

// ─── Auto-detect relevant skill from prompt ─────────────────────────────────
function autoDetectSkill(prompt, availableSkills) {
  if (!prompt || !availableSkills || availableSkills.length === 0) return null;
  const lower = prompt.toLowerCase();

  // 1. Code Generator patterns (explicit intent to generate or create code)
  const isCodeGen =
    /\b(generate|create|write|build|make|scaffold)\b.*\b(html|css|javascript|js|python|react|vue|node|script|component|app|function|algorithm|template|boilerplate|landing page)\b/i.test(lower) ||
    /\b(html|css|javascript|python|react|typescript|sql)\b.*\b(code|example|boilerplate|template|page|script|markup)\b/i.test(lower) ||
    /\b(code generator|generate code|generate a simple html|create a simple html|build an html|create html)\b/i.test(lower);

  if (isCodeGen && availableSkills.some((s) => s.name === "code-generator")) {
    return "code-generator";
  }

  // 2. Code Reviewer patterns (explicit intent to review/audit/debug code)
  const isCodeReview =
    /\b(review|audit|critique|inspect|debug|optimize|refactor)\b.*\b(code|function|script|snippet|pr|pull request|implementation|syntax|bug)\b/i.test(lower) ||
    /\b(code review|review this code|critique this code|audit this code)\b/i.test(lower);

  if (isCodeReview && availableSkills.some((s) => s.name === "code-reviewer")) {
    return "code-reviewer";
  }

  // 3. Lesson Planner patterns (explicit intent to build educational curricula/lesson plans)
  const isLessonPlan =
    /\b(lesson plan|plan a lesson|curriculum|teaching plan|syllabus|course outline|educator guide)\b/i.test(lower) ||
    /\b(teach a class|lesson for students|create a lesson|educational plan)\b/i.test(lower);

  if (isLessonPlan && availableSkills.some((s) => s.name === "lesson-planner")) {
    return "lesson-planner";
  }

  return null;
}

// ─── SSE helpers ──────────────────────────────────────────────────────────────
function sseEvent(controller, encoder, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(payload));
}

// ─── Main route handler ───────────────────────────────────────────────────────
export async function POST(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => sseEvent(controller, encoder, event, data);

      try {
        // ── Parse multipart or JSON body ─────────────────────────────────────
        let messages = [];
        let skillName = null;
        let imageData = null;
        let imageMimeType = null;

        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const messagesRaw = formData.get("messages");
          messages = JSON.parse(messagesRaw);
          skillName = formData.get("skill") || null;

          const imageFile = formData.get("image");
          if (imageFile && imageFile.size > 0) {
            // Validate image
            if (imageFile.size > MAX_IMAGE_BYTES) {
              send("error", {
                code: "IMAGE_TOO_LARGE",
                message: `Image exceeds the 5 MB limit (got ${(imageFile.size / 1024 / 1024).toFixed(1)} MB). Please use a smaller image.`,
              });
              controller.close();
              return;
            }

            const allowedTypes = [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
            ];
            if (!allowedTypes.includes(imageFile.type)) {
              send("error", {
                code: "INVALID_IMAGE_TYPE",
                message: `File type "${imageFile.type}" is not supported. Please upload a JPEG, PNG, GIF, or WebP image.`,
              });
              controller.close();
              return;
            }

            const arrayBuffer = await imageFile.arrayBuffer();
            imageData = Buffer.from(arrayBuffer).toString("base64");
            imageMimeType = imageFile.type;
          }
        } else {
          const body = await request.json();
          messages = body.messages;
          skillName = body.skill || null;
        }

        // ── Initialize Google Gen AI client ──────────────────────────────────
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const availableSkills = getAvailableSkills();

        // ── Auto-pick skill if not explicitly specified ──────────────────────
        let isAutoDetected = false;
        if (!skillName) {
          const lastUserMsg = messages.filter((m) => m.role === "user").pop();
          const userPrompt = lastUserMsg?.content || "";
          const detected = autoDetectSkill(userPrompt, availableSkills);
          if (detected) {
            skillName = detected;
            isAutoDetected = true;
          }
        }

        // ── Load skill instruction ───────────────────────────────────────────
        let systemInstruction =
          "You are Agentheek, a helpful and knowledgeable AI assistant. Be concise yet thorough. When you see an image, describe and analyze it in detail as part of your response.";

        if (skillName) {
          const skillObj = availableSkills.find((s) => s.name === skillName);
          const skillContent = skillObj ? skillObj.content : loadSkill(skillName);
          if (skillContent) {
            systemInstruction = skillContent;
            send("skill_active", {
              skill: skillName,
              displayName: skillObj?.displayName || skillName,
              autoDetected: isAutoDetected,
            });
          } else {
            send("warning", {
              message: `Skill "${skillName}" not found. Responding without skill.`,
            });
          }
        }

        // ── Build Gemini contents array from history ──────────────────────────
        const contents = [];

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];

          if (msg.role === "user") {
            const parts = [];

            // If last user message and we have image data, attach it
            if (i === messages.length - 1 && imageData) {
              parts.push({
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageData,
                },
              });
            }

            if (msg.content && msg.content.trim()) {
              parts.push({ text: msg.content.trim() });
            } else if (parts.length === 0) {
              parts.push({ text: "[User message]" });
            }

            if (parts.length > 0) {
              contents.push({ role: "user", parts });
            }
          } else if (msg.role === "assistant" || msg.role === "model") {
            if (msg.content && msg.content.trim()) {
              contents.push({
                role: "model",
                parts: [{ text: msg.content.trim() }],
              });
            }
          }
        }

        // ── Initial streaming call ────────────────────────────────────────────
        let response;
        try {
          response = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents,
            config: {
              systemInstruction,
              tools,
              temperature: 0.7,
            },
          });
        } catch (apiErr) {
          const status = apiErr?.status || apiErr?.code;
          // Extract a clean message — the SDK wraps errors in JSON strings
          let cleanMessage = apiErr.message || "Unknown error";
          try {
            // Gemini errors often embed JSON in the message string
            const jsonMatch = cleanMessage.match(/\{.*\}/s);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              cleanMessage = parsed?.error?.message || parsed?.message || cleanMessage;
            }
          } catch (_) { /* keep original */ }

          if (status === 429 || cleanMessage.toLowerCase().includes('quota') || cleanMessage.toLowerCase().includes('rate')) {
            send("error", {
              code: "RATE_LIMITED",
              message: "The AI service is currently rate-limited. Please wait a moment and try again.",
            });
          } else if (cleanMessage.toLowerCase().includes('api key') || cleanMessage.toLowerCase().includes('invalid_argument')) {
            send("error", {
              code: "INVALID_API_KEY",
              message: "Invalid API key. Please check your GEMINI_API_KEY in .env.local and restart the server.",
            });
          } else {
            send("error", {
              code: "API_ERROR",
              message: `AI API error: ${cleanMessage}`,
            });
          }
          controller.close();
          return;
        }

        // ── Stream tokens and handle tool calls ───────────────────────────────
        let fullText = "";
        let pendingToolCalls = [];
        let modelParts = [];

        try {
          for await (const chunk of response) {
            // Use SDK helper for text
            const text = chunk.text;
            if (text) {
              fullText += text;
              send("token", { text });
            }

            // Capture raw model parts to preserve thoughtSignature and call id
            if (chunk.candidates?.[0]?.content?.parts) {
              modelParts.push(...chunk.candidates[0].content.parts);
            }

            // Use SDK helper for function calls
            const fnCalls = chunk.functionCalls;
            if (fnCalls && fnCalls.length > 0) {
              pendingToolCalls.push(...fnCalls);
            }
          }
        } catch (streamErr) {
          const isTrailingBufferError =
            streamErr?.message &&
            streamErr.message.includes("Incomplete JSON segment at the end");

          // If content was already streamed and the error is just an unparsed trailing EOF segment,
          // complete normally rather than wiping out the response with an error.
          if (fullText && fullText.trim().length > 0 && isTrailingBufferError) {
            send("done", { fullText });
            controller.close();
            return;
          }

          send("error", {
            code: "STREAM_BROKEN",
            message: `The response stream broke mid-reply: ${streamErr.message}. ${fullText ? "Partial response received." : "No content was received."}`,
            partialContent: fullText || "",
          });
          controller.close();
          return;
        }

        // ── Handle tool calls if any ──────────────────────────────────────────
        if (pendingToolCalls.length > 0) {
          const toolResponseParts = [];

          for (const toolCall of pendingToolCalls) {
            const { name, args, id } = toolCall;
            const city = args?.city || args?.location || "London";

            // Notify UI that tool is being called
            send("tool_call", { name, args: { city } });

            // Execute tool
            let toolResult;
            try {
              if (name === "get_weather") {
                toolResult = await get_weather(city);
              } else {
                throw new Error(`Unknown tool: ${name}`);
              }
            } catch (toolErr) {
              send("tool_error", {
                name,
                message: `Tool "${name}" failed: ${toolErr.message}`,
              });
              toolResult = {
                error: toolErr.message,
                name,
              };
            }

            // Notify UI of tool result
            send("tool_result", { name, result: toolResult });

            toolResponseParts.push({
              functionResponse: {
                name,
                response: toolResult,
                ...(id ? { id } : {}),
              },
            });
          }

          // Build the follow-up conversation preserving modelParts (thoughtSignature)
          const validModelParts =
            modelParts.length > 0
              ? modelParts
              : [
                  ...(fullText ? [{ text: fullText }] : []),
                  ...pendingToolCalls.map((tc) => ({ functionCall: tc })),
                ];

          const toolContents = [
            ...contents,
            {
              role: "model",
              parts: validModelParts,
            },
            {
              role: "user",
              parts: toolResponseParts,
            },
          ];

          // Continue streaming with tool result
          let continueResponse;
          try {
            continueResponse = await ai.models.generateContentStream({
              model: MODEL_ID,
              contents: toolContents,
              config: {
                systemInstruction,
                tools,
                temperature: 0.7,
              },
            });
          } catch (continueErr) {
            send("error", {
              code: "API_ERROR",
              message: `Error continuing after tool call: ${continueErr.message}`,
            });
            controller.close();
            return;
          }

          try {
            for await (const chunk of continueResponse) {
              const text = chunk.text;
              if (text) {
                fullText += text;
                send("token", { text });
              }
            }
          } catch (continueStreamErr) {
            const isTrailingBufferError =
              continueStreamErr?.message &&
              continueStreamErr.message.includes("Incomplete JSON segment at the end");

            if (fullText && fullText.trim().length > 0 && isTrailingBufferError) {
              send("done", { fullText });
              controller.close();
              return;
            }

            send("error", {
              code: "STREAM_BROKEN",
              message: `Stream broke after tool call: ${continueStreamErr.message}`,
              partialContent: fullText || "",
            });
            controller.close();
            return;
          }
        }

        send("done", { fullText });
        controller.close();
      } catch (err) {
        const encoder2 = new TextEncoder();
        const payload = `event: error\ndata: ${JSON.stringify({
          code: "UNEXPECTED",
          message: err.message || "An unexpected error occurred.",
        })}\n\n`;
        controller.enqueue(encoder2.encode(payload));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
