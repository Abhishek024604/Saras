const AgentDocs = () => {
    return (
        <div className="flex min-h-0 flex-1 flex-col bg-white">
            {/* Header */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#ddd] bg-white px-4">
                <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-tr from-[#3f0e40] to-[#1264a3] text-[7px] font-black text-white">
                        AI
                    </span>
                    <span className="text-sm font-bold text-[#1d1c1d]">Agent Docs</span>
                    <span className="text-xs text-[#616061]">• Knowledge Base</span>
                </div>
            </div>

            {/* Empty Page Body - Add your Agent Docs UI designs here */}
            <div className="flex flex-1 items-center justify-center p-8 bg-white">
                <div className="text-center text-[#616061]">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f8f8f8] border border-[#eee] text-xl">
                        🤖
                    </div>
                    <h2 className="text-sm font-bold text-[#1d1c1d]">Agent Docs Page</h2>
                    <p className="mt-1 text-xs text-[#868686]">
                        This page is currently empty. Add your UI designs here.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AgentDocs;
