import { Router } from "express";
import {verifyJwt} from "../middleware/auth.middlewares.js"
import { getAllUsersNotification, readUserNotification } from "../controllers/notification.controller.js";

const router = Router()

router.route("/").get(verifyJwt, getAllUsersNotification)
router.route("/read/:notificationId").patch(verifyJwt, readUserNotification)

export default router