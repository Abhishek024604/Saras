import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket = null;

export const connectSocket = (accessToken) => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: {
                accessToken,
            },
            transports: ["websocket"],
        });
    }

    return socket;
};

export const getSocket = () => {
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};