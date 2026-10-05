import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin || "null",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Vary": "Origin",
};

interface AnalyzeMiseryPayload {
  type: "misery";
  bleeding: string;
  sacrifice: string;
  oxygen: string[];
}

interface AnalyzeSynthesisPayload {
  type: "synthesis";
  synthesis: string;
}

type RequestPayload = AnalyzeMiseryPayload | AnalyzeSynthesisPayload;

const MAX_TEXT = 5000;
const MAX_OXYGEN_ITEMS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validatePayload(value: unknown): RequestPayload {
  if (!isRecord(value) || (value.type !== "misery" && value.type !== "synthesis")) {
    throw new Error("Invalid request type");
  }

  if (value.type === "misery") {
    const { bleeding, sacrifice, oxygen } = value;
    if (
      typeof bleeding !== "string" ||
      !["head", "heart", "body"].includes(bleeding) ||
      typeof sacrifice !== "string" ||
      !["head", "heart", "body"].includes(sacrifice) ||
      !Array.isArray(oxygen) ||
      oxygen.length > MAX_OXYGEN_ITEMS ||
      oxygen.some((item) => typeof item !== "string" || item.length > 500)
    ) {
      throw new Error("Invalid misery payload");
    }

    return {
      type: "misery",
      bleeding,
      sacrifice,
      oxygen,
    };
  }

  if (typeof value.synthesis !== "string" || value.synthesis.trim().length < 1 || value.synthesis.length > MAX_TEXT) {
    throw new Error("Invalid synthesis payload");
  }

  return {
    type: "synthesis",
    synthesis: value.synthesis.trim(),
  };
}

async function callGeminiAPI(prompt: string, systemInstruction: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured in Edge Function secrets");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    console.error("Gemini API status:", response.status);
    throw new Error("AI provider request failed");
  }

  const data = await response.json();
  const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof analysis !== "string" || !analysis.trim()) {
    throw new Error("AI provider returned no analysis");
  }

  return analysis.slice(0, 10000);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = validatePayload(await req.json());

    const systemInstruction =
      "You are SRAP-AI. Be direct, reflective, and useful. Do not present subjective body sensations as medical diagnoses. Do not claim certainty about a person's mental or physical condition.";

    let prompt = "";

    if (payload.type === "misery") {
      prompt = `
Act as SRAP-AI and analyze the user's current reflection without false comfort.

User data:
- Center that feels most affected: ${payload.bleeding}
- Center selected as today's sacrifice: ${payload.sacrifice}
- Oxygen actions: ${payload.oxygen.join(", ") || "None"}

Task:
1. Explain the trade-off in practical terms.
2. Identify a consequence the user should consider.
3. Give one concise verdict.

Use a dark, philosophical, direct tone, but frame interpretations as reflections rather than facts.
`;
    } else {
      prompt = `
Act as SRAP-AI and analyze this user synthesis.

User synthesis:
---BEGIN USER TEXT---
${payload.synthesis}
---END USER TEXT---

Task:
1. Identify whether the reasoning appears internally coherent.
2. Point out one possible self-deception or blind spot, if present.
3. End with one sharp reflective question.

Be direct, useful, and avoid diagnosing the user.
`;
    }

    const analysis = await callGeminiAPI(prompt, systemInstruction);

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.startsWith("Invalid ") ? 400 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
