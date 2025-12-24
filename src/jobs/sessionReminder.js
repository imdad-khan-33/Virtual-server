import nodeCron from "node-cron";
import { SessionSchedule } from "../models/sessionSchedule.model.js";
import { mailSender } from "../utils/mailSender.js";
import { ApiError } from "../utils/ApiError.js";
import { sendNotificationToUser } from "../sockets/index.js";

const CRON_EXPRESSION = process.env.NODE_ENV === "production" ? "* * * * *" : "* * * * *";

export const startSessionReminderJob = (io) => {
  nodeCron.schedule(CRON_EXPRESSION, async () => {
    try {
      const now = new Date();

      const sessions = await SessionSchedule.find({
        nextSessionDate: { $lte: now },
      });

      if (!sessions.length) {
        // console.log(`[CRON] No sessions due at this time: ${now.toISOString()}`);
        return;
      }

      for (const session of sessions) {
        try {
          const { userId, userName, email, frequency, nextSessionDate, createdAt } = session;

          const isWeekly = frequency === "weekly";
          const isMonthly = frequency === "monthly";

          const title = isWeekly
            ? `Time for Your Weekly Self-Care 🌿`
            : `It's Time for Your Monthly Reflection 🌙`;

          const body = `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <p>Hi ${userName},</p>
              <p>This is your ${isWeekly ? "weekly" : "monthly"
            } reminder to pause and reconnect with yourself.</p>
              <p>💡 Whether it's journaling, painting, or simply breathing — your self-care matters.</p>
              <p>🗓 Next session date: <strong>${new Date(
              nextSessionDate
            ).toLocaleDateString()}</strong></p>
              <p>💚 Take good care,</p>
              <p><strong>Your Virtual Therapist</strong></p>
            </div>
          `;

          const emailSent = await mailSender(email, title, body);
          if (!emailSent) {
            console.warn(`[CRON] Failed to send reminder to: ${email}`);
            continue;
          }

          //Emit a socket notification to user if they're online
          await sendNotificationToUser(io, userId, {
            title,
            message: "reminder you have session today.",
            time: createdAt
          });
          console.log(`[CRON] Sending reminder to user: ${userId} (${email})`);

          // Update session info
          session.lastSessionDate = now;

          if (isWeekly) {
            session.nextSessionDate = new Date(
              nextSessionDate.getTime() + 7 * 24 * 60 * 60 * 1000
            );
          } else if (isMonthly) {
            const nextDate = new Date(nextSessionDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            session.nextSessionDate = nextDate;
          }

          await session.save();
          console.log(`[CRON] Reminder sent to ${email} (${frequency})`);
        } catch (innerError) {
          console.error(
            `[CRON] Error processing session for userId: ${session.userId}`,
            innerError
          );
        }
      }
    } catch (error) {
      console.error("[CRON] Session Reminder Job Failed:", error);
      throw new ApiError(500, "Cron job failed");
    }
  });
}
