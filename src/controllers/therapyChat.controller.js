import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { TherapyChat } from "../models/therapyChat.model.js";
import { generateTitleFromPrompt, getAiTherapyResponse } from "../services/therapyChat.service.js";
import { streamTherapyResponse } from "../services/therapyChatStreaming.service.js";
import { cleanResponse } from "../utils/commonFunctions.js";
import { get } from "mongoose";

const chat = asyncHandler(async (req, res) => {
  const { userPrompt } = req.body;
  const { sessionId } = req.params;
  const userId = req.user._id;

  let session;
  let isNewSession = false;

  if (sessionId) {
    session = await TherapyChat.findById(sessionId);
  }
  if (!session) {
    isNewSession = true;
    session = await TherapyChat.create({
      userId,
      title: "new therapy chat",
      messages: [],
    });
  }
  const previousMessages = session.messages;

  try {
    const promises = []

    // generate title if there is no session available 
    if(isNewSession){
      promises.push(generateTitleFromPrompt(userPrompt))
    } else {
      promises.push(Promise.resolve(null)); // placeholder to keep Promise.all order consistent
    }
    promises.push(getAiTherapyResponse({
       userPrompt,
       previousMessages,
     }))

     const [generatedTitle, therapyChatResponse] = await Promise.all(promises);

    //  console.log("generatedTitle : ", generatedTitle);
     
    // const therapyChatResponse = await getAiTherapyResponse({
    //   userPrompt,
    //   previousMessages,
    // });

    // console.log("cleanTherapyResponse:  ", therapyChatResponse);
    
    const userMessage = {
      role: "user",
      content: userPrompt,
      timestamp: new Date(),
    };


    const assistantMessage = {
      role: "assistant",
      content: therapyChatResponse,
      timestamp: new Date(),
    };


    // this will add generated title to the db
    if(isNewSession && generatedTitle){
      session.title = generatedTitle;
    }

    session.messages.push(userMessage, assistantMessage);
    await session.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sessionId: session._id,
          userId,
          title: generatedTitle,
          userPrompt: userPrompt,
          // assistantResponse: therapyChatResponse.content,
          assistantResponse: therapyChatResponse,
          // assistantResponse: cleanTherapyResponse,
          timestamp: assistantMessage.timestamp,
        },
        "chat bot response"
      )
    );
  } catch (error) {
    console.error("Therapy Chat Error", error);
    throw new ApiError(500, "something went wrong");
  }
});

const streamChat = asyncHandler(async (req, res) => {
  const { userPrompt } = req.body;
  const userId = "6882079e739074695be6bd4d";

  let session = await TherapyChat.findOne({ userId });

  if (!session) {
    session = await TherapyChat.create({
      userId,
      title: "New Therapy Chat",
      messages: [],
    });
  }

  const previousMessages = session.messages;

  // 🧠 Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let fullResponse = "";

    await streamTherapyResponse({
      userPrompt,
      previousMessages,
      onChunk: (token) => {
        fullResponse += token;
        res.write(`data: ${token}\n\n`); // 🧠 push each token
      },
    });

    const userMessage = {
      role: "user",
      content: userPrompt,
      timestamp: new Date(),
    };

    const assistantMessage = {
      role: "assistant",
      content: fullResponse,
      timestamp: new Date(),
    };

    session.messages.push(userMessage, assistantMessage);
    await session.save();

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Streaming chat error:", error);
    res.write("data: [ERROR]\n\n");
    res.end();
  }
});


const getTherapyChatById = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  const session = await TherapyChat.findOne({ _id: sessionId, userId });
  if (!session || session.length === 0) {
    return res.status(200).json(new ApiResponse(200, session, "no session found"))
  }
  return res
    .status(200)
    .json(new ApiResponse(200, session, "user chat session retrved"));
});

const getUserAllTherapyChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessions = await TherapyChat.find({ userId }).sort({ updatedAt: -1 });

  if (!sessions || sessions.length === 0) {
        return res.status(200).json(new ApiResponse(200, sessions, "no session found"))
  }
  try {
    const sessionInfo = sessions.map((session) => ({
      sessionId: session._id,
      title: session.title,
    }));
    return res
      .status(200)
      .json(new ApiResponse(200, sessionInfo, "all session ids fetched"));
  } catch (error) {
    console.error("something went wrong while fetching user session ids");
    throw new ApiError(500, "something went wrong while fetching session ids");
  }
});
export { chat, getTherapyChatById, getUserAllTherapyChat, streamChat };
