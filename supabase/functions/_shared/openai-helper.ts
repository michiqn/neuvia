// Shared OpenAI helper for consistent API calls, logging, and error handling

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAIRequestOptions {
  functionName: string;
  messages: OpenAIMessage[];
  model?: string;
  tools?: OpenAITool[];
  toolChoice?: { type: "function"; function: { name: string } };
  /** Ask for LaTeX math in text fields the frontend renders with KaTeX */
  mathFormatting?: boolean;
  /** Use OpenAI JSON mode so the response is always syntactically valid JSON */
  jsonMode?: boolean;
}

export interface OpenAIResponse {
  success: boolean;
  content?: string;
  toolCallArguments?: string;
  error?: string;
  statusCode?: number;
}

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

// Appended to the system prompt (when mathFormatting is set) so formulas render with KaTeX in the frontend
const MATH_FORMAT_INSTRUCTION = `

Formatting of math: in explanations, questions, answers and feedback, wrap every piece of math in dollar signs, including single symbols inside a sentence: $...$ inline (e.g. "the parameters $a_{i-1}$, $\\alpha_{i-1}$, $d_i$ and $\\theta_i$") and $$...$$ for standalone equations. Never write plain-text math like A_i,i-1 or theta_i. Inside dollar signs use real LaTeX: commands like \\Delta, \\sum, \\cdot or \\frac, never * for multiplication, and no English words (keep words outside the dollar signs or use \\text{...}). Exception: the JSON fields "title" and "nextTopic" are shown as plain text and must not contain dollar signs or LaTeX; write them in words. Markdown headings inside the content may use math.`;

function withMathFormatting(messages: OpenAIMessage[]): OpenAIMessage[] {
  let added = false;
  return messages.map((message) => {
    if (!added && message.role === "system") {
      added = true;
      return { ...message, content: message.content + MATH_FORMAT_INSTRUCTION };
    }
    return message;
  });
}

/**
 * Makes a request to the OpenAI API with consistent logging and error handling
 */
export async function callOpenAI(options: OpenAIRequestOptions): Promise<OpenAIResponse> {
  const { functionName, messages, model = "gpt-5-nano-2025-08-07", tools, toolChoice, mathFormatting = false, jsonMode = false } = options;

  console.log(`[${functionName}] Starting OpenAI request`);
  console.log(`[${functionName}] Model: ${model}`);
  console.log(`[${functionName}] Messages count: ${messages.length}`);

  if (!openAIApiKey) {
    console.error(`[${functionName}] OPENAI_API_KEY is not configured`);
    return {
      success: false,
      error: "OpenAI API key not configured",
      statusCode: 500,
    };
  }

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages: mathFormatting ? withMathFormatting(messages) : messages,
    };

    if (jsonMode) {
      requestBody.response_format = { type: "json_object" };
    }

    // Add tools if provided (for structured output)
    if (tools && toolChoice) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${functionName}] OpenAI API error: ${response.status}`, errorText);
      return {
        success: false,
        error: `OpenAI API error: ${response.status}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    console.log(`[${functionName}] OpenAI response received successfully`);

    // Handle tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      console.log(`[${functionName}] Tool call received: ${toolCall.function.name}`);
      return {
        success: true,
        toolCallArguments: toolCall.function.arguments,
      };
    }

    // Handle regular content response
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log(`[${functionName}] Content received, length: ${content.length}`);
      return {
        success: true,
        content,
      };
    }

    console.error(`[${functionName}] No content or tool call in response`);
    return {
      success: false,
      error: "Invalid AI response - no content returned",
      statusCode: 500,
    };
  } catch (error) {
    console.error(`[${functionName}] Exception:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    };
  }
}

/**
 * Creates a standardized error response
 */
export function errorResponse(message: string, statusCode = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Creates a standardized success response
 */
export function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Handles CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Rejects requests that don't come from a signed-in user.
 * The public anon key alone is not enough, so the OpenAI key can't be used by anyone who finds the URL.
 */
export async function requireUser(req: Request, functionName: string): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error(`[${functionName}] Unauthorized: missing Authorization header`);
    return errorResponse("Unauthorized", 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    console.error(`[${functionName}] Unauthorized: no valid user session`);
    return errorResponse("Unauthorized", 401);
  }
  return null;
}

/**
 * Parses JSON from AI response that might contain extra text
 */
/**
 * JSON.parse that tolerates the mistakes small models make with LaTeX in JSON strings:
 * invalid escapes like "\alpha" or "\," (should be "\\alpha") and a missing closing quote at the end.
 */
export function parseJSONLenient<T>(text: string): T {
  const escapesFixed = text.replace(/\\\\|\\(?!["\\/bfnrtu])/g, (match) => (match === "\\\\" ? match : "\\\\"));
  const candidates = [text, escapesFixed];
  for (const candidate of [...candidates]) {
    candidates.push(candidate.replace(/([^"\s])\s*\}$/, '$1"}'));
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function extractJSON<T>(content: string): T | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return parseJSONLenient<T>(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse JSON from content:", error);
    return null;
  }
}
