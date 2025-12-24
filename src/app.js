import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";


const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL,  // http://localhost:5173
    process.env.LIVE_URL,    // https://virtual-therapist-frontend.vercel.app
];

// ✅ Keep only ONE CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS: " + origin));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
}));

// common middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(passport.initialize());

// routes
import userRouter from "./routes/user.routes.js";
import { errorHandler } from "./middleware/error.middlewares.js";
import healthecheckRouter from "./routes/healthcheck.routes.js";
import assessmentQuestionRouter from "./routes/assessmentQuestion.routes.js";
import assessmentAnswerRouter from "./routes/assessmentAnswer.routes.js";
import otpRouter from "./routes/otp.routes.js";
import therapyChatRouter from "./routes/therapyChat.routes.js";
import notificationRouter from "./routes/notification.routes.js";

app.use("/api/v1/healthcheck", healthecheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/assessment_question", assessmentQuestionRouter);
app.use("/api/v1/assessment_answer", assessmentAnswerRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/therapy", therapyChatRouter);
app.use("/api/v1/notification", notificationRouter);

app.use(errorHandler);

export { app };