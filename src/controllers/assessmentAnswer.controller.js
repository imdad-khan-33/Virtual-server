import { AssessmentAnswers } from "../models/assessmentAnswers.model.js";
import { SessionSchedule } from "../models/sessionSchedule.model.js";
import { initialAssessment } from "../services/deepSeek.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateSessionPlan } from "../utils/generateSessionPlan.js";
import { mailSender } from "../utils/mailSender.js";
import { extractJson } from '../utils/commonFunctions.js'
import { sendNotificationToUser } from "../sockets/index.js";
const answers = asyncHandler(async (req, res) => {
  const { response: userAnswers, questionsAndAnswers } = req.body;
  const userId = req?.user?._id;
  const { username } = req?.user;
  const io = req.app.get("io");
  if (!Array.isArray(questionsAndAnswers) || questionsAndAnswers.length === 0) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "Invalid or missing questionsAndAnswers array.")
      );
  }

  if (
    !Array.isArray(userAnswers) ||
    userAnswers.length === 0 ||
    userAnswers.some(
      (item) =>
        typeof item.question !== "string" ||
        typeof item.questionId !== "string" ||
        typeof item.answer !== "string" ||
        !item.question.trim() ||
        !item.answer.trim()
    )
  ) {
    throw new ApiError(
      400,
      "Each response must contain a valid questionId and answer."
    );
  }

  if (!userId) {
    throw new ApiError(400, "Invalid user id");
  }
  const existing = await AssessmentAnswers.findOne({ userId });
  if (existing) {
    throw new ApiError(409, "User Already answer the questions");
  }

  // ============ DEEPSEEK API COMMENTED OUT FOR TESTING ============
  // const initialAssessementResponse = await initialAssessment(
  //   questionsAndAnswers,
  //   username
  // );

  // if (!initialAssessementResponse?.content) {
  //   return res.status(500).json({ error: "Invalid GPT response format." });
  // }

  // const rawGPTResponse = initialAssessementResponse?.content;
  // const cleanResponse = extractJson(rawGPTResponse);

  // let parsedResponse;
  // try {
  //   parsedResponse = JSON.parse(cleanResponse);
  // } catch (error) {
  //   console.error("Failed to parse GPT response:", cleanResponse);
  //   throw new ApiError(500, "Failed to parse response from AI");
  // }
  // ============ END DEEPSEEK COMMENTED OUT ============

  // MOCK RESPONSE FOR TESTING (Remove this when DeepSeek API is configured)
  const parsedResponse = {
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
  // END MOCK RESPONSE

  try {
    const save = await AssessmentAnswers.create({
      userId,
      response: userAnswers,
      initialAssessment: parsedResponse,
      completed: true,
    });
    if (!save) {
      throw new ApiError(400, "Something went wrong while creating ans");
    }
    const { userName, selfCareActivity, sessionRecommendation, fullText } =
      parsedResponse;
    const userEmail = req?.user?.email;
    const title = `Your Initial Assessment & Self-Care Plan 🌱`;
    const body = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>Hi ${userName?.charAt(0).toUpperCase() + userName?.slice(1) || "there"
      },</p>

    <p>Thank you for completing the assessment! Here’s your personalized self-care plan and our initial thoughts based on your responses:</p>

    <h2 style="color: #4CAF50;"> Self-Care Activity: ${selfCareActivity.description
      }</h2>

    <p><strong>Description:</strong><br>
    A weekly creative time designed to balance routine and novelty.</p>

    <p><strong>Details:</strong></p>
    <ul>
      ${selfCareActivity.details.map((item) => `<li>${item}</li>`).join("")}
    </ul>

    <p><strong>Clinical Rationale:</strong><br>
    ${selfCareActivity.clinicalRationale}</p>

    <h2 style="color: #4CAF50;">🗓 Session Recommendation</h2>
    <p><strong>Frequency:</strong>  ${sessionRecommendation.frequency}</p>
    <p><strong>Reason:</strong><br>
     ${sessionRecommendation.reason}

     <h2 style="color: #4CAF50;">Personalized Note</h2>
    <blockquote style="border-left: 4px solid #4CAF50; padding-left: 15px; color: #555;">
      ${fullText}
    </blockquote>
    <p>for more info kindly visit user dashboard</p>
    <p>Warmly,<br>
    <strong>Virtual Therapist</strong></p>
  </div>`;

    // ============ EMAIL SENDING COMMENTED OUT FOR TESTING ============
    // const assessmentEmail = await mailSender(userEmail, title, body);
    // if (!assessmentEmail) {
    //   console.log("something went wrong while sending assessment email");
    //   throw new ApiError(
    //     400,
    //     "something went wrong while sending assessment email"
    //   );
    // }
    // ============ END EMAIL COMMENTED OUT ============
    console.log("Email sending skipped for testing");

    // ============ NOTIFICATION COMMENTED OUT FOR TESTING ============
    // const notify = await sendNotificationToUser(io, userId, {
    //   title: "Initial Assessment Completed",
    //   message: "Your personalized self-care plan is now available.",
    //   time: new Date()
    // })
    // console.log("notify: ", notify);
    // ============ END NOTIFICATION COMMENTED OUT ============

    const totalSessions =
      parseInt(sessionRecommendation.schedule.match(/\d+/)?.[0]) || 4;

    const sessions = generateSessionPlan({
      frequency: sessionRecommendation.frequency.toLowerCase(),
      totalSessions,
      startDate: new Date(),
    });

    const sessionInfo = await SessionSchedule.create({
      userId,
      userName,
      email: userEmail,
      frequency: sessionRecommendation.frequency.toLowerCase(),
      // nextSessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), //for one week
      // nextSessionDate: new Date(Date.now() + 1 * 60 * 1000), // 1 minutes from now
      nextSessionDate: sessions[0].sessionDate,
      sessions,
    });

    if (!sessionInfo) {
      console.log("something went wrong while creating session");
      throw new ApiError(400, "something went wrong while creating session");
    }
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { response: parsedResponse, sessionInfo },
          "initial assesment chatbot response and also assessmet email sent"
        )
      );
  } catch (error) {
    console.error("Something went wrong while creating answers", error);
    throw new ApiError(500, "Something went wrong while creating answers");
  }
});

const getAllUserAnswer = asyncHandler(async (req, res) => {
  const userId = req?.user?._id;

  if (!userId) {
    throw new ApiError(400, "Invalid user id");
  }

  try {
    const result = await AssessmentAnswers.aggregate([
      { $match: { userId } },

      { $unwind: "$response" }, // Break each response

      {
        $lookup: {
          from: "assessmentquestions", // must match MongoDB collection name
          localField: "response.questionId",
          foreignField: "_id",
          as: "questionDetails",
        },
      },
      { $unwind: "$questionDetails" },

      {
        $lookup: {
          from: "sessionschedules", // name of the collection to join
          localField: "userId", // field in the current docs
          foreignField: "userId", // field in the other collection
          as: "sessionInfo", // result will be stored in this field
        },
      },
      { $unwind: { path: "$sessionInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          "sessionInfo.frequency": 1,
          "sessionInfo.nextSessionDate": 1,
          "sessionInfo.lastSessionDate": 1,
          "sessionInfo.sessions": 1,
          response: 1,
          questionDetails: 1,
          userId: 1,
          initialAssessment: 1,
          completed: 1,
          assessmentDate: 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          initialAssessment: { $first: "$initialAssessment" },
          completed: { $first: "$completed" },
          assessmentDate: { $first: "$assessmentDate" },
          session: { $first: "$sessionInfo" },
          responses: {
            $push: {
              questionNo: "$questionDetails.questionNo",
              questionText: "$questionDetails.text",
              options: "$questionDetails.options",
              selectedAnswer: "$response.answer",
            },
          },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, result, "No assessment data found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, result[0], "Detailed assessment data fetched")
      );
  } catch (error) {
    console.error("Error fetching detailed assessment:", error);
    throw new ApiError(500, "Error fetching user assessment details");
  }
});

export { answers, getAllUserAnswer };
