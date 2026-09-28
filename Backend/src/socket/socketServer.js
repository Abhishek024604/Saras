import { Server } from "socket.io";

import { verifyAccessToken } from "../services/tokenService.js";

import { authorizeChannelAccess } from "./channelAuthorization.js";
import { createMessage } from "../services/messageService.js";
import {
    setSocketIO,
} from "./socketEmitter.js";


export const initializeSocket = (httpServer) => {

    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        },
    });

    setSocketIO(io);

    // Socket authentication middleware
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.accessToken;

            if (!token) {
                return next(
                    new Error("Access token is required")
                );
            }

            const decoded = verifyAccessToken(token);

            if (!decoded?.userId) {
                return next(
                    new Error("Invalid access token")
                );
            }

            socket.user = {
                id: decoded.userId,
            };

            next();
        } catch (error) {
            console.error(
                "Socket authentication failed:",
                error.message
            );

            next(
                new Error("Socket authentication failed")
            );
        }
    });

    io.on("connection", (socket) => {
        console.log(
            `Authenticated socket connected: ${socket.id}`
        );

        console.log(
            `User ID: ${socket.user.id}`
        );

        // send message
        socket.on(
            "message:send",
            async ({ channelId, content }, callback) => {
                try {
                    if (!channelId) {
                        return callback?.({
                            success: false,
                            message: "Channel ID is required",
                        });
                    }

                    if (
                        typeof content !== "string" ||
                        !content.trim()
                    ) {
                        return callback?.({
                            success: false,
                            message: "Message content is required",
                        });
                    }

                    if (content.length > 5000) {
                        return callback?.({
                            success: false,
                            message: "Message cannot exceed 5000 characters",
                        });
                    }

                    // Verify that the user can access this channel
                    await authorizeChannelAccess({
                        channelId,
                        userId: socket.user.id,
                    });

                    const roomName = `channel:${channelId}`;

                    if (!socket.rooms.has(roomName)) {
                        return callback?.({
                            success: false,
                            message:
                                "You must join the channel before sending messages",
                        });
                    }

                    // Persist the message using the existing service
                    const message = await createMessage({
                        channelId,
                        senderId: socket.user.id,
                        senderType: "USER",
                        content,
                    });

                    // Broadcast the saved message to channel members
                    io.to(roomName).emit(
                        "message:new",
                        message
                    );

                    // Acknowledge successful message creation
                    callback?.({
                        success: true,
                        messageId: message.id,
                    });
                } catch (error) {
                    console.error(
                        "Message sending failed:",
                        error.message
                    );

                    callback?.({
                        success: false,
                        message: error.message,
                    });
                }
            }
        );

        // Join a channel room
        socket.on(
            "channel:join",
            async ({ channelId }, callback) => {
                try {
                    const channel =
                        await authorizeChannelAccess({
                            channelId,
                            userId: socket.user.id,
                        });

                    const roomName =
                        `channel:${channel.id}`;

                    socket.join(roomName);

                    console.log(
                        `User ${socket.user.id} joined ${roomName}`
                    );

                    callback?.({
                        success: true,
                        channel,
                    });
                } catch (error) {
                    console.error(
                        "Channel join failed:",
                        error.message
                    );

                    callback?.({
                        success: false,
                        message: error.message,
                    });
                }
            }
        );

        // Leave a channel room
        socket.on(
            "channel:leave",
            ({ channelId }, callback) => {
                if (!channelId) {
                    return callback?.({
                        success: false,
                        message: "Channel ID is required",
                    });
                }

                const roomName =
                    `channel:${channelId}`;

                socket.leave(roomName);

                console.log(
                    `User ${socket.user.id} left ${roomName}`
                );

                callback?.({
                    success: true,
                });
            }
        );

        socket.on("disconnect", (reason) => {
            console.log(
                `Socket disconnected: ${socket.id}`,
                reason
            );
        });
    });

    return io;
};


