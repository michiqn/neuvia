import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
  parseJSONLenient,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "generate-curriculum";

// Type definitions
interface SuggestedMilestone {
  title: string;
  briefDescription: string;
}

serve(async (req) => {
  console.log(`\n========== [${FUNCTION_NAME}] NEW REQUEST ==========`);
  console.log(`[${FUNCTION_NAME}] Method: ${req.method}`);
  console.log(`[${FUNCTION_NAME}] URL: ${req.url}`);

  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log(`[${FUNCTION_NAME}] Returning CORS response`);
    return corsResponse;
  }

  const authResponse = await requireUser(req, FUNCTION_NAME);
  if (authResponse) return authResponse;

  try {
    const rawBody = await req.text();
    console.log(`[${FUNCTION_NAME}] Raw request body:`, rawBody);

    const parsedBody = JSON.parse(rawBody);
    console.log(`[${FUNCTION_NAME}] Parsed body:`, JSON.stringify(parsedBody, null, 2));

    const { goal, context } = parsedBody;

    if (!goal) {
      console.error(`[${FUNCTION_NAME}] ERROR: Goal is missing`);
      return errorResponse("Learning goal is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Goal: "${goal}"`);
    console.log(`[${FUNCTION_NAME}] Context: "${context || 'N/A'}"`);
    console.log(`[${FUNCTION_NAME}] ==============================`);

    const systemPrompt = `You are an expert curriculum designer and learning specialist. Your task is to create an overall curriculum outline with a detailed first milestone for adaptive learning.

Guidelines:
- Create an overall curriculum outline describing the complete learning journey (3-5 paragraphs)
- Suggest a sequence of 3-5 major milestones (titles and brief descriptions only) - these are just suggestions for the learning path
- Provide FULL DETAILS for the FIRST milestone only (title, description, and first topic)
- Include progression context to help guide future adaptive milestone generation
- Start with foundational concepts and indicate progression to advanced topics
- The curriculum should be adaptive - later milestones will be generated based on student progress and performance
- Make the curriculum outline inspiring and clear about the learning journey`;

    const userPrompt = `Create a learning curriculum for the following goal:

Goal: ${goal}
${context ? `Additional context: ${context}` : ""}

Generate:
1. An overall curriculum outline describing the complete learning journey
2. A suggested sequence of 3-5 major milestones (titles and brief descriptions only)
3. FULL DETAILS for the first milestone only (title, description, firstTopic)
4. Progression context to help guide future adaptive milestone generation`;

    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-5-nano-2025-08-07",
      tools: [
        {
          type: "function",
          function: {
            name: "generate_curriculum",
            description: "Generate a curriculum outline with first milestone for adaptive learning",
            parameters: {
              type: "object",
              properties: {
                curriculum: {
                  type: "string",
                  description: "Overall curriculum outline describing the complete learning journey (3-5 paragraphs)",
                },
                suggestedMilestones: {
                  type: "array",
                  description: "High-level outline of suggested milestones (not generated yet, just suggestions)",
                  items: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "Concise title for the suggested milestone",
                      },
                      briefDescription: {
                        type: "string",
                        description: "Brief description of what this milestone would cover",
                      },
                    },
                    required: ["title", "briefDescription"],
                  },
                },
                firstMilestone: {
                  type: "object",
                  description: "The fully detailed first milestone to start with",
                  properties: {
                    title: {
                      type: "string",
                      description: "A concise title for the first milestone",
                    },
                    description: {
                      type: "string",
                      description: "A detailed description of what will be learned in this milestone",
                    },
                    firstTopic: {
                      type: "string",
                      description: "The first topic to start learning this milestone",
                    },
                  },
                  required: ["title", "description", "firstTopic"],
                },
                progressionContext: {
                  type: "object",
                  description: "Context to guide future adaptive milestone generation",
                  properties: {
                    recommendedTopicSequence: {
                      type: "array",
                      items: { type: "string" },
                      description: "Suggested sequence of topics to cover",
                    },
                    difficultyProgression: {
                      type: "string",
                      description: "Description of how difficulty should progress",
                    },
                    keyLearningObjectives: {
                      type: "array",
                      items: { type: "string" },
                      description: "Key objectives for the entire learning path",
                    },
                  },
                },
              },
              required: ["curriculum", "firstMilestone"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "generate_curriculum" } },
    });

    if (!result.success) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to generate curriculum", result.statusCode);
    }

    if (!result.toolCallArguments) {
      console.error(`[${FUNCTION_NAME}] No tool call arguments in response`);
      return errorResponse("Invalid AI response - no structured data returned");
    }

    const parsedResult = parseJSONLenient(result.toolCallArguments);
    console.log(`[${FUNCTION_NAME}] ===== GENERATED CURRICULUM =====`);
    console.log(`[${FUNCTION_NAME}] Curriculum length: ${parsedResult.curriculum?.length || 0} chars`);
    console.log(`[${FUNCTION_NAME}] Suggested milestones: ${parsedResult.suggestedMilestones?.length || 0}`);
    parsedResult.suggestedMilestones?.forEach((m: SuggestedMilestone, i: number) => {
      console.log(`[${FUNCTION_NAME}]   ${i + 1}. "${m.title}"`);
    });
    console.log(`[${FUNCTION_NAME}] First milestone: "${parsedResult.firstMilestone?.title}" - First Topic: "${parsedResult.firstMilestone?.firstTopic}"`);
    console.log(`[${FUNCTION_NAME}] ================================`);

    const responseData = {
      curriculum: parsedResult.curriculum,
      suggestedMilestones: parsedResult.suggestedMilestones || [],
      firstMilestone: parsedResult.firstMilestone,
      progressionContext: parsedResult.progressionContext || {},
    };
    console.log(`[${FUNCTION_NAME}] Response object keys:`, Object.keys(responseData));
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse(responseData);
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    console.log(`========== [${FUNCTION_NAME}] REQUEST FAILED ==========\n`);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
