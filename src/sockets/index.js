import { Server } from "socket.io";
import { Notification } from "../models/notification.model.js";
// import connectedUsers from '../utils/connectedUser.js';

const connectedUsers = new Map(); // Optional: map userId -> socket.id

export const initSocket = (server) => {
    const url = process.env.NODE_ENV === 'production' ? process.env.LIVE_URL : process.env.CLIENT_URL
    console.log("url: ", url);
    
  const io = new Server(server, {
    cors: {
      origin: url || "http://localhost:5173",
    //   methods: ["GET", "POST"],
      credentials: true,
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected", socket.id);

    socket.on("register", async (userId) => {
      console.log(`User ${userId} registered with socket ${socket.id}`);
      socket.userId = userId;
      connectedUsers.set(userId, socket.id);
      console.log("connectedUsers: ", connectedUsers);
      
      const undelivered = await Notification.find({ userId, delivered: false });

      for(const notif of undelivered){
         io.to(socket.id).emit("notification", {
          title: notif.title,
          message: notif.message,
          time: notif.createdAt
        });

        notif.delivered = true;
        await notif.save();
      }
    });


    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
      }
    });
  });

  return io;
};

export const sendNotificationToUser = async (io, userId, data) => {

  const [firstEntry] = connectedUsers.entries(); // returns [userId, socketId]
  const [userid, socketId] = firstEntry;
  console.log("UserID:", userid);
  console.log("SocketID:", socketId);
  console.log("Socket truthy:", !!socketId);
  
  // Save notification
  await Notification.create({
    userId,
    title: data.title,
    message: data.message,
    delivered: !!socketId,
  });

  if (socketId) {
    io.to(socketId).emit("notification", data);
  }else {
    console.warn(`[SOCKET] No connected socket for user: ${userId}`);
  }
};
