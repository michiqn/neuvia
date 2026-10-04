import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  extractJSON,
  requireUser,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "quiz-generate-question";

interface QuizQuestionData {
  question: string;
  answers: string[];
  correctAnswer: number;
}

interface ExistingQuiz {
  question: string;
  answers: string[];
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

    const { contentContext, existingQuizzes } = parsedBody;

    if (!contentContext) {
      console.error(`[${FUNCTION_NAME}] ERROR: Content context is missing`);
      return errorResponse("Content context is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] Content context length: ${contentContext?.length || 0}`);
    console.log(`[${FUNCTION_NAME}] Existing quizzes count: ${existingQuizzes?.length || 0}`);

    // Token optimization: Only include last 5 quizzes if more than 5 exist
    let quizzesToInclude: ExistingQuiz[] = [];
    if (existingQuizzes && existingQuizzes.length > 0) {
      if (existingQuizzes.length > 5) {
        quizzesToInclude = existingQuizzes.slice(-5);
        console.log(`[${FUNCTION_NAME}] Using last 5 quizzes out of ${existingQuizzes.length} total`);
      } else {
        quizzesToInclude = existingQuizzes;
      }
    }

    // Format existing quizzes for context
    let existingQuizzesContext = "";
    if (quizzesToInclude.length > 0) {
      existingQuizzesContext = "\n\nPreviously asked questions (DO NOT repeat these):\n";
      quizzesToInclude.forEach((quiz, index) => {
        existingQuizzesContext += `${index + 1}. ${quiz.question}\n`;
      });
    }

    const systemPrompt = `You are an expert quiz question generator for educational content. Generate a multiple-choice quiz question based on the learning content below.

Learning content:
---
${contentContext}
---
${existingQuizzesContext}

Requirements:
- Create ONE multiple-choice question that tests understanding of the content
- Provide EXACTLY 4 answer options
- Make the question clear and specific
- Ensure answers are distinct and plausible
- Only ONE answer should be correct
- Make wrong answers reasonable but clearly incorrect
- If there are existing questions above, create a NEW question on a DIFFERENT aspect of the content
- Focus on testing comprehension, not just memorization

Respond ONLY with valid JSON in this exact format:
{
  "question": "Your question here?",
  "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
  "correctAnswer": 0
}

The "correctAnswer" field should be the index (0-3) of the correct answer in the "answers" array.`;

    console.log(`[${FUNCTION_NAME}] ===== SYSTEM PROMPT =====`);
    console.log(`[${FUNCTION_NAME}] ${systemPrompt}`);
    console.log(`[${FUNCTION_NAME}] =========================`);

    const userMessage = "Generate a quiz question based on the content provided.";

    console.log(`[${FUNCTION_NAME}] ===== USER MESSAGE =====`);
    console.log(`[${FUNCTION_NAME}] ${userMessage}`);
    console.log(`[${FUNCTION_NAME}] ========================`);

    console.log(`[${FUNCTION_NAME}] Calling OpenAI...`);
    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      mathFormatting: true,
      jsonMode: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "gpt-5-nano-2025-08-07",
    });

    console.log(`[${FUNCTION_NAME}] OpenAI result:`, JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to generate quiz question", result.statusCode);
    }

    if (!result.content) {
      console.error(`[${FUNCTION_NAME}] No content in OpenAI response`);
      return errorResponse("Invalid AI response - no content returned");
    }

    console.log(`[${FUNCTION_NAME}] AI response: ${result.content}`);

    // Parse JSON from response
    const quizData = extractJSON<QuizQuestionData>(result.content);
    console.log(`[${FUNCTION_NAME}] Parsed quiz:`, quizData);

    if (!quizData || !quizData.question || !quizData.answers || typeof quizData.correctAnswer !== 'number') {
      console.error(`[${FUNCTION_NAME}] Failed to parse quiz JSON or missing required fields`);
      console.error(`[${FUNCTION_NAME}] Question: "${quizData?.question}"`);
      console.error(`[${FUNCTION_NAME}] Answers: ${quizData?.answers}`);
      console.error(`[${FUNCTION_NAME}] Correct Answer: ${quizData?.correctAnswer}`);
      return errorResponse("Failed to parse quiz response");
    }

    if (quizData.answers.length !== 4) {
      console.error(`[${FUNCTION_NAME}] Invalid number of answers: ${quizData.answers.length}`);
      return errorResponse("Quiz must have exactly 4 answers");
    }

    if (quizData.correctAnswer < 0 || quizData.correctAnswer > 3) {
      console.error(`[${FUNCTION_NAME}] Invalid correctAnswer index: ${quizData.correctAnswer}`);
      return errorResponse("Correct answer index must be between 0 and 3");
    }

    console.log(`[${FUNCTION_NAME}] SUCCESS - Returning quiz`);
    console.log(`[${FUNCTION_NAME}] Question: "${quizData.question}"`);
    console.log(`[${FUNCTION_NAME}] Answers: ${JSON.stringify(quizData.answers)}`);
    console.log(`[${FUNCTION_NAME}] Correct Answer Index: ${quizData.correctAnswer}`);
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse({
      question: quizData.question,
      answers: quizData.answers,
      correctAnswer: quizData.correctAnswer
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
