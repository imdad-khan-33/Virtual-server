import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/notification.model.js";

const getAllUsersNotification  = asyncHandler(async(req, res) => {
    const userId = req.user?._id
    if(!userId){
        throw new ApiError(400, "User ID is required")
    }
    try {
        const allNotification = await Notification.find({userId})
        if(allNotification.length === 0){
            return res.status(200).json(new ApiResponse(200, allNotification, "no notification found"))
        }
    
        return res.status(200).json(new ApiResponse(200, allNotification, "user all notification fetched successfully"))
    } catch (error) {
        console.log("something went wrong while getting notification", error);
        throw new ApiError(500, "something went wrong while getting notification")
    }
    
})


const readUserNotification = asyncHandler( async(req, res) => {
    const userId = req.user?._id
    const {notificationId} = req.params
    console.log("notificationId: ", notificationId);
    
    if(!userId) throw new ApiError(400, "user ID is required")
    
    try {
        const readNotification = await Notification.findByIdAndUpdate(notificationId, { isRead: true}, {new: true})
        if (!readNotification) {
        console.warn(`Notification with ID ${notificationId} not found`);
        }
        return res.status(200).json(new ApiResponse(200, readNotification, "notifiaction read successfully"))
    } catch (error) {
        console.log("something went wrong while reading notification", error);
        throw new ApiError(500, "something went wrong while reading notification")
    }
})
export {getAllUsersNotification, readUserNotification}