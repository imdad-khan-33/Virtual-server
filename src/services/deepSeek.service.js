import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
export async function initialAssessment(questionsAndAnswers, username) {
  const OPENROUTER_API_KEY = process.env.DEEPSEEK_API_KEY;
  
  // If no API key or using placeholder, return mock response for testing
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "your-deepseek-api-key-here") {
    console.log("Using mock response (no valid API key configured)");
    const mockResponse = {
      userName: username,
      selfCareActivity: {
        description: "Daily Mindfulness & Journaling Practice",
        details: [
          "Fixed element: 10 minutes every morning after waking up",
          "Variable element: Alternate between guided meditation apps and free-form journaling",
          "Optional: Share one insight weekly with a trusted friend or family member"
        ],
        clinicalRationale: "Combining structure with variety helps maintain engagement while building consistent self-reflection habits."
      },
      sessionRecommendation: {
        frequency: "weekly",
        schedule: "one session per week, total 4 sessions",
        reason: "Based on your responses, regular weekly check-ins will help establish a supportive routine and track your progress effectively."
      },
      fullText: `Hello ${username}, thank you for sharing your thoughts with me. Based on what you've told me, I can see you're taking an important step toward better understanding yourself. Think of this journey like tending a garden - some days you plant seeds, other days you simply water what's already growing. I recommend we meet weekly to nurture your progress together. Let's work as a team to help you flourish.`
    };
    return { content: JSON.stringify(mockResponse) };
  }

  const systemPrompt = `
You are a warm, highly skilled virtual therapist. Your role is exclusively to provide therapeutic support and mental health guidance. 

**Response Rules:**
1. If the user asks ANY non-therapy related question (facts, general knowledge, etc.), respond with:
   "I'm a virtual therapist here to support your mental health and wellbeing. I specialize in therapeutic conversations rather than general knowledge questions. How are you feeling today?"

2. For therapy-related requests, follow these guidelines:
   - Provide one personalized self-care activity that bridges contradictions
   - Choose weekly if the user's responses suggest active distress, need for regular accountability, or rapid progress.
   - Choose monthly if the user appears stable, reflective, or prefers slower-paced support.
   - Do not default to weekly. Assess the user’s tone, urgency, and needs before deciding.
   - Based on the user's tone, depth of concern, and emotional complexity, suggest a total number of sessions (e.g., 3, 4, 6).
   - Use fewer sessions (e.g., 3) for focused reflection and self-awareness; more sessions (e.g., 6 or more) for users who express confusion, struggle with decision-making, or report ongoing emotional challenges.
   - Respond in natural dialogue format with a therapeutic tone
   - Use JSON format when structured output is requested
`;
  const formattedAssessment = questionsAndAnswers
    .map((qna) => `${qna.question}\n→ ${qna.answer}`)
    .join("\n\n");

  console.log("formattedAssessment: ", formattedAssessment);

  const userPrompt = `
Please analyze this assessment for ${username} and provide therapeutic recommendations:

**User Assessment:**
${formattedAssessment}

**Response Format (JSON):**
{
  "userName": "${username}",
  "selfCareActivity": {
    "description": "[Concrete activity]",
    "details": [
      "Fixed element: [time/structure]",
      "Variable element: [novelty component]",
      "Optional: [social suggestion]"
    ],
    "clinicalRationale": "[1-sentence why]"
  },
  "sessionRecommendation": {
    "frequency": "[weekly/monthly]",
     "schedule": "one session per [week/month], total [3–6] sessions",
  "reason": "[why this cadence and session count fit the user's needs]"
  },
  "fullText": "[Natural dialogue with metaphor + collaboration]"
}
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1:free",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return only the assistant's reply content
    const assistantMessage = response.data.choices?.[0]?.message?.content;
    return { content: assistantMessage };
  } catch (error) {
    console.error(
      "OpenRouter API Error:",
      error.response?.data || error.message
    );
    throw new ApiError(500, "something went wrong");
  }
}
