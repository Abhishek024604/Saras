let ioInstance = null;

export const setSocketIO = (io) => {
    ioInstance = io;
};

export const emitToChannel = (
    channelId,
    event,
    payload
) => {
    if (!ioInstance) {
        console.warn(
            "Socket.IO instance has not been initialized"
        );

        return;
    }

    ioInstance
        .to(`channel:${channelId}`)
        .emit(event, payload);
};