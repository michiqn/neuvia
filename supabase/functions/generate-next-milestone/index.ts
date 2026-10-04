import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
  parseJSONLenient,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "generate-next-milestone";

type SupabaseClient = ReturnType<typeof createClient>;

interface LearningPathRow {
  goal: string;
  curriculum: string | null;
}

interface MilestoneRow {
  id: string;
  title: string;
  milestone_status: string | null;
}

serve(async (req) => {
  console.log(`\n========== [${FUNCTION_NAME}] NEW REQUEST ==========`);
  console.log(`[${FUNCTION_NAME}] Method: ${req.method}`);

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
    const { learningPathId, customTopicRequest } = parsedBody;

    if (!learningPathId) {
      console.error(`[${FUNCTION_NAME}] ERROR: learningPathId is missing`);
      return errorResponse("learningPathId is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Learning Path ID: "${learningPathId}"`);
    console.log(`[${FUNCTION_NAME}] Custom Topic Request: "${customTopicRequest || 'N/A'}"`);
    console.log(`[${FUNCTION_NAME}] ==============================`);

    // Initialize Supabase client with auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${FUNCTION_NAME}] ERROR: No authorization header`);
      return errorResponse("Unauthorized", 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Fetch learning path with all context
    console.log(`[${FUNCTION_NAME}] Fetching learning path...`);
    const { data: learningPath, error: pathError } = await supabaseClient
      .from('learning_paths')
      .select('*')
      .eq('id', learningPathId)
      .single();

    if (pathError) {
      console.error(`[${FUNCTION_NAME}] Error fetching learning path:`, pathError);
      throw pathError;
    }

    console.log(`[${FUNCTION_NAME}] Learning path goal: "${learningPath.goal}"`);

    // Fetch all milestones for this path
    console.log(`[${FUNCTION_NAME}] Fetching milestones...`);
    const { data: milestones, error: milestonesError } = await supabaseClient
      .from('milestones')
      .select('*')
      .eq('learning_path_id', learningPathId)
      .order('order_index');

    if (milestonesError) {
      console.error(`[${FUNCTION_NAME}] Error fetching milestones:`, milestonesError);
      throw milestonesError;
    }

    console.log(`[${FUNCTION_NAME}] Existing milestones: ${milestones?.length || 0}`);

    // Gather bubble summaries from the previous (most recently completed) milestone
    console.log(`[${FUNCTION_NAME}] Fetching summaries from previous milestone...`);
    const previousMilestoneSummaries = await getPreviousMilestoneSummaries(supabaseClient, milestones || []);
    console.log(`[${FUNCTION_NAME}] Previous milestone summaries: ${previousMilestoneSummaries.length} found`);

    // Build system prompt
    const systemPrompt = buildAdaptiveSystemPrompt(
      learningPath,
      milestones || [],
      previousMilestoneSummaries,
      customTopicRequest
    );

    const userPrompt = buildUserPrompt(
      learningPath,
      milestones || [],
      previousMilestoneSummaries,
      customTopicRequest
    );

    console.log(`[${FUNCTION_NAME}] Calling OpenAI for adaptive milestone generation...`);
    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-5-nano-2025-08-07",
      tools: [{
        type: "function",
        function: {
          name: "generate_next_milestone",
          description: "Generate the next milestone based on student progress",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Concise title for the milestone",
              },
              description: {
                type: "string",
                description: "Detailed description of what will be learned",
              },
              firstTopic: {
                type: "string",
                description: "The first topic to start learning this milestone",
              },
              adaptiveReasoning: {
                type: "string",
                description: "Explanation of why this milestone is appropriate given student's progress",
              },
            },
            required: ["title", "description", "firstTopic", "adaptiveReasoning"],
          },
        },
      }],
      toolChoice: { type: "function", function: { name: "generate_next_milestone" } },
    });

    if (!result.success || !result.toolCallArguments) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to generate next milestone", result.statusCode);
    }

    const milestone = parseJSONLenient(result.toolCallArguments);
    console.log(`[${FUNCTION_NAME}] ===== GENERATED MILESTONE =====`);
    console.log(`[${FUNCTION_NAME}] Title: "${milestone.title}"`);
    console.log(`[${FUNCTION_NAME}] First Topic: "${milestone.firstTopic}"`);
    console.log(`[${FUNCTION_NAME}] Adaptive Reasoning: "${milestone.adaptiveReasoning}"`);
    console.log(`[${FUNCTION_NAME}] ================================`);

    const responseData = {
      milestone,
      orderIndex: milestones?.length || 0,
    };

    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);
    return successResponse(responseData);

  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    console.log(`========== [${FUNCTION_NAME}] REQUEST FAILED ==========\n`);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});

// Helper function to get summaries from the previous (most recently completed) milestone
async function getPreviousMilestoneSummaries(supabaseClient: SupabaseClient, milestones: MilestoneRow[]) {
  // Find the most recently completed milestone
  const completedMilestones = milestones.filter(m => m.milestone_status === 'completed');

  if (completedMilestones.length === 0) {
    return [];
  }

  // Get the last completed milestone
  const previousMilestone = completedMilestones[completedMilestones.length - 1];

  // Get all content bubbles for this milestone
  const { data: contentBubbles } = await supabaseClient
    .from('content_bubbles')
    .select('id')
    .eq('milestone_id', previousMilestone.id);

  const contentBubbleIds = contentBubbles?.map((cb: { id: string }) => cb.id) || [];

  if (contentBubbleIds.length === 0) {
    return [];
  }

  // Get all summaries for these content bubbles
  const { data: summaries } = await supabaseClient
    .from('summaries')
    .select('summary_text')
    .in('content_bubble_id', contentBubbleIds);

  return summaries?.map((s: { summary_text: string }) => s.summary_text).filter((text: string) => text && text.trim()) || [];
}

function buildAdaptiveSystemPrompt(
  learningPath: LearningPathRow,
  milestones: MilestoneRow[],
  previousMilestoneSummaries: string[],
  customTopicRequest?: string
) {
  const completedMilestones = milestones.filter(m => m.milestone_status === 'completed');

  // Truncate curriculum to first 50 and last 50 characters
  let curriculumPreview = '';
  if (learningPath.curriculum) {
    const curr = learningPath.curriculum;
    if (curr.length <= 100) {
      curriculumPreview = curr;
    } else {
      const firstPart = curr.substring(0, 50);
      const lastPart = curr.substring(curr.length - 50);
      curriculumPreview = `${firstPart}...${lastPart}`;
    }
  }

  return `You are an expert adaptive learning curriculum designer. You generate the next milestone
based on what the student has learned so far.

Learning Path Goal: ${learningPath.goal}
${curriculumPreview ? `Overall Curriculum (abbreviated): ${curriculumPreview}` : ''}

Previous Milestones Completed:
${completedMilestones.length > 0
  ? completedMilestones.map(m => `- ${m.title}`).join('\n')
  : '- None yet'}

${previousMilestoneSummaries.length > 0 ? `
What the student learned in the previous milestone:
${previousMilestoneSummaries.map((summary, i) => `${i + 1}. ${summary}`).join('\n')}
` : ''}

${customTopicRequest ? `
IMPORTANT: The student has requested a custom topic: "${customTopicRequest}"
While respecting their request, ensure it fits logically into the learning path and builds on their current knowledge.
Explain in the adaptiveReasoning how this topic connects to their learning journey.
` : `
Generate the next milestone that:
1. Builds upon completed milestones and what was learned
2. Follows the curriculum outline
3. Provides appropriate challenge without overwhelming
4. Clearly explains in adaptiveReasoning why this milestone is next
`}

Guidelines:
- Make titles concise but descriptive
- Descriptions should be detailed and inspiring
- The firstTopic should be the most fundamental concept to start this milestone
- The adaptiveReasoning should clearly explain why this milestone is appropriate now`;
}

function buildUserPrompt(
  learningPath: LearningPathRow,
  milestones: MilestoneRow[],
  previousMilestoneSummaries: string[],
  customTopicRequest?: string
) {
  if (customTopicRequest) {
    return `Generate a milestone for the custom topic: "${customTopicRequest}"

Ensure it:
1. Integrates with the overall learning goal: ${learningPath.goal}
2. Builds on the student's current knowledge from completed milestones
3. Includes a clear first topic to start with
4. Explains in adaptiveReasoning how this connects to their learning journey`;
  }

  const hasPreviousLearning = previousMilestoneSummaries.length > 0;

  if (!hasPreviousLearning) {
    return `Based on the curriculum outline, generate the next logical milestone in the learning journey toward: ${learningPath.goal}

Since this is early in the path, follow the curriculum outline's suggested progression.
The milestone should build naturally on the completed milestones and include a clear starting point (firstTopic).`;
  }

  return `Based on what the student has learned, generate the next milestone
in their learning journey toward: ${learningPath.goal}

The milestone should:
1. Follow the curriculum outline's suggested progression
2. Build upon completed milestones and what was learned
3. Include a clear starting point (firstTopic)
4. Provide appropriate challenge based on their current knowledge`;
}
