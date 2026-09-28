import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";

const formatChannelName = (name) => name?.replace(/^#/, "") || "channel";

const MessageList = ({ messages, loading, channel, isFiltered = false }) => {
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!isFiltered) {
            bottomRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [messages, isFiltered]);

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center bg-white">
                <div className="flex items-center gap-3 text-sm text-[#616061]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#007a5a]" />
                    Loading messages...
                </div>
            </div>
        );
    }

    if (!messages.length) {
        return (
            <div className="flex flex-1 items-center justify-center bg-white px-6">
                <div className="max-w-md text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-[#f4ede4] text-3xl font-black text-[#4a154b]">
                        #
                    </div>

                    <h3 className="mt-5 text-lg font-black text-[#1d1c1d]">
                        {isFiltered
                            ? "No matching messages"
                            : `Welcome to #${formatChannelName(channel?.name)}`}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#616061]">
                        {isFiltered
                            ? "Try a different search term or clear the search field."
                            : "This is the beginning of the channel. Send a message to start the conversation."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="slack-scrollbar flex-1 overflow-y-auto bg-white py-4">
            {!isFiltered && (
                <div className="px-5 pb-5 pt-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-[#f4ede4] text-4xl font-black text-[#4a154b]">
                        #
                    </div>

                    <h2 className="mt-4 text-2xl font-black text-[#1d1c1d]">
                        #{formatChannelName(channel?.name)}
                    </h2>

                    <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#616061]">
                        {channel?.description ||
                            "This channel is ready for project conversations and updates."}
                    </p>
                </div>
            )}

            <div className="space-y-0.5">
                {messages.map((message) => (
                    <MessageItem key={message.id} message={message} />
                ))}

                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default MessageList;
