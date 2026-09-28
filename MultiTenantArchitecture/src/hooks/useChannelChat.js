import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/api";

const SOCKET_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const useChannelChat = (channelId) => {
    const socketRef = useRef(null);
    const joinPromiseRef = useRef(null);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const loadMessages = useCallback(async () => {
        if (!channelId) return;

        try {
            setLoading(true);
            setError("");

            const response = await api.getChannelMessages(channelId);

            const fetchedMessages =
                response.messages ||
                response.data ||
                response ||
                [];

            setMessages(fetchedMessages);
        } catch (error) {
            setError(
                error.message || "Failed to load messages."
            );
        } finally {
            setLoading(false);
        }
    }, [channelId]);

    useEffect(() => {
        if (!channelId) return;

        loadMessages();

        const accessToken =
            localStorage.getItem("accessToken");

        const socket = io(SOCKET_URL, {
            auth: {
                accessToken,
            },
            transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            joinPromiseRef.current = new Promise((resolve, reject) => {
                socket.emit(
                    "channel:join",
                    { channelId },
                    (acknowledgement) => {
                        if (!acknowledgement?.success) {
                            const joinError = new Error(
                                acknowledgement?.message ||
                                    "Unable to join this channel."
                            );
                            setError(joinError.message);
                            reject(joinError);
                            return;
                        }

                        resolve(acknowledgement);
                    }
                );
            });
        });

        socket.on("message:new", (message) => {
            if (!message || message.channelId !== channelId) {
                return;
            }

            setMessages((previousMessages) => {
                const alreadyExists = previousMessages.some(
                    (existingMessage) =>
                        existingMessage.id === message.id
                );

                if (alreadyExists) {
                    return previousMessages;
                }

                return [...previousMessages, message];
            });
        });

        socket.on("connect_error", (socketError) => {
            setError(
                socketError.message ||
                    "Unable to connect to the message server."
            );
        });

        return () => {
            socket.emit("channel:leave", {
                channelId,
            });

            socket.disconnect();
            socketRef.current = null;
            joinPromiseRef.current = null;
        };
    }, [channelId, loadMessages]);

    const sendMessage = useCallback(
        async (content) => {
            const trimmedContent = content.trim();

            if (!trimmedContent || !channelId) {
                return;
            }

            const socket = socketRef.current;

            if (!socket?.connected || !joinPromiseRef.current) {
                throw new Error(
                    "Connection unavailable. Please try again."
                );
            }

            try {
                setSending(true);
                await joinPromiseRef.current;

                await new Promise((resolve, reject) => {
                    socket.emit(
                        "message:send",
                        {
                            channelId,
                            content: trimmedContent,
                        },
                        (acknowledgement) => {
                            if (
                                !acknowledgement ||
                                !acknowledgement.success
                            ) {
                                reject(
                                    new Error(
                                        acknowledgement?.message ||
                                            "Failed to send message."
                                    )
                                );
                                return;
                            }

                            resolve(acknowledgement);
                        }
                    );
                });
            } finally {
                setSending(false);
            }
        },
        [channelId]
    );

    return {
        messages,
        loading,
        sending,
        error,
        sendMessage,
        reloadMessages: loadMessages,
    };
};

export default useChannelChat;