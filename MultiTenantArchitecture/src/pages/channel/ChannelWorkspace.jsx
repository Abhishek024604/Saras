import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../api/api";
import useChannelChat from "../../hooks/useChannelChat";

import ChannelHeader from "../../components/chat/ChannelHeader";
import MessageList from "../../components/chat/MessageList";
import MessageComposer from "../../components/chat/MessageComposer";
import InviteMemberModal from "../../components/workspace/InviteMemberModal";
import ProjectAgentsPanel from "../../components/workspace/ProjectAgentsPanel";
import PrivateSpace from "../../components/private/PrivateSpace";
import Docs from "../knowledgeBase/Docs";
import AgentDocs from "../knowledgeBase/AgentDocs";

const getInitial = (value, fallback = "W") =>
    value?.trim()?.charAt(0)?.toUpperCase() || fallback;

const formatChannelName = (name) => name?.replace(/^#/, "") || "channel";

const SlackLogo = () => (
    <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const Icon = ({ children, className = "" }) => (
    <svg
        className={className}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {children}
    </svg>
);

const ChannelWorkspace = () => {
    const { tenantId, projectId, channelId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [channels, setChannels] = useState([]);
    const [loadingProject, setLoadingProject] = useState(true);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [dialog, setDialog] = useState(null);
    const [dialogProjectId, setDialogProjectId] = useState("");
    const [dialogName, setDialogName] = useState("");
    const [dialogDescription, setDialogDescription] = useState("");
    const [dialogLoading, setDialogLoading] = useState(false);
    const [dialogError, setDialogError] = useState("");
    const [activeSpace, setActiveSpace] = useState("project");
    const [knowledgeBaseView, setKnowledgeBaseView] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [projectAgents, setProjectAgents] = useState([]);
    const [agentDefinitions, setAgentDefinitions] = useState([]);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const response = await api.getCurrentUser();
                setCurrentUser(response.user || response.data || response);
            } catch {
                // optional user profile
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        const loadAgentDefinitions = async () => {
            try {
                const response = await api.getAgentDefinitions();
                setAgentDefinitions(response.data || response.definitions || []);
            } catch {
                // optional agent definitions
            }
        };
        loadAgentDefinitions();
    }, []);

    const [executingAgent, setExecutingAgent] = useState(false);
    const [provisioningAgents, setProvisioningAgents] = useState(false);

    const loadProjectAgents = async () => {
        if (!projectId) return;
        try {
            const response = await api.getProjectAgents(projectId);
            const fetched = response.projectAgents || response.data || [];
            if (fetched.length === 0) {
                try {
                    const prov = await api.provisionProjectAgents(projectId);
                    setProjectAgents(prov.data || prov.projectAgents || []);
                    return;
                } catch {
                    // ignore if no permission
                }
            }
            setProjectAgents(fetched);
        } catch {
            // optional agents list
        }
    };

    useEffect(() => {
        loadProjectAgents();
    }, [projectId]);

    const handleProvisionAgents = async () => {
        if (!projectId) return;
        try {
            setProvisioningAgents(true);
            setError("");
            const prov = await api.provisionProjectAgents(projectId);
            const updated = prov.data || prov.projectAgents || [];
            setProjectAgents(updated);
        } catch (err) {
            setError(err.message || "Failed to provision agents.");
        } finally {
            setProvisioningAgents(false);
        }
    };

    const availableAgents = useMemo(() => {
        const list = [...projectAgents];
        const existingDefIds = new Set(
            projectAgents.map((pa) => pa.agentDefinitionId || pa.agentDefinition?.id)
        );

        for (const def of agentDefinitions) {
            if (!existingDefIds.has(def.id)) {
                list.push({
                    id: def.id,
                    agentDefinitionId: def.id,
                    displayName: def.name,
                    agentDefinition: def,
                    isDefinitionOnly: true,
                });
            }
        }

        return list;
    }, [projectAgents, agentDefinitions]);

    const activeChannel = useMemo(() => {
        if (!channels.length) return null;

        if (channelId) {
            return channels.find((channel) => channel.id === channelId) || null;
        }

        return channels.find((channel) => channel.name === "general") || channels[0];
    }, [channels, channelId]);

    const activeChannelId = activeChannel?.id || null;

    const {
        messages,
        loading: loadingMessages,
        sending,
        error: chatError,
        sendMessage,
        reloadMessages,
    } = useChannelChat(activeChannelId);

    const handleExecuteAgentTask = async (agentId, task) => {
        if (!activeChannelId) return;
        try {
            setExecutingAgent(true);
            setError("");
            let targetAgent = projectAgents.find((pa) => pa.id === agentId);
            if (!targetAgent) {
                // If it was a definition-only agent or not yet provisioned, provision now
                const prov = await api.provisionProjectAgents(projectId);
                const updatedList = prov.data || prov.projectAgents || [];
                setProjectAgents(updatedList);
                targetAgent = updatedList.find(
                    (pa) => pa.id === agentId || pa.agentDefinitionId === agentId
                ) || updatedList[0];
            }

            if (!targetAgent?.id) {
                throw new Error("Unable to locate provisioned agent for task.");
            }

            await api.executeAgentTask({
                projectAgentId: targetAgent.id,
                channelId: activeChannelId,
                task,
            });

            if (reloadMessages) {
                setTimeout(() => {
                    reloadMessages();
                }, 400);
            }
        } catch (taskErr) {
            console.error("Execute agent task failed:", taskErr);
            setError(taskErr.message || "Failed to execute agent task");
        } finally {
            setExecutingAgent(false);
        }
    };

    const filteredMessages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) return messages;

        return messages.filter((message) => {
            const senderName =
                message.sender?.name ||
                message.sender?.firstName ||
                message.user?.name ||
                "";

            return (
                message.content?.toLowerCase().includes(query) ||
                senderName.toLowerCase().includes(query)
            );
        });
    }, [messages, searchQuery]);

    useEffect(() => {
        const loadWorkspace = async () => {
            try {
                if (projects.length === 0) {
                    setLoadingProject(true);
                }
                setError("");

                const response = await api.getProjects(tenantId);
                const loadedProjects = response.projects || [];
                setProjects(loadedProjects);
            } catch (loadError) {
                setError(loadError.message || "Failed to load workspace.");
            } finally {
                setLoadingProject(false);
                setLoadingChannels(false);
            }
        };

        if (tenantId) {
            loadWorkspace();
        }
    }, [tenantId]);

    useEffect(() => {
        if (!projects.length) return;

        const currentProject = projects.find(
            (candidate) => candidate.id === projectId
        );

        if (currentProject) {
            setProject(currentProject);
            setChannels(currentProject.channels || []);
            setError("");
        } else if (!loadingProject) {
            setError("Project not found.");
        }
    }, [loadingProject, projectId, projects]);

    useEffect(() => {
        if (
            !channelId &&
            project?.id === projectId &&
            channels.length > 0
        ) {
            const defaultChan = channels.find((c) => c.name === "general") || channels[0];
            if (defaultChan) {
                navigate(
                    `/tenants/${tenantId}/projects/${projectId}/channels/${defaultChan.id}`,
                    { replace: true }
                );
            }
        }
    }, [channelId, channels, navigate, project?.id, projectId, tenantId]);

    const handleChannelSelect = (selectedProjectId, selectedChannelId) => {
        setKnowledgeBaseView(null);
        navigate(
            `/tenants/${tenantId}/projects/${selectedProjectId}/channels/${selectedChannelId}`
        );
    };

    const handleProjectSelect = (selectedProjectId) => {
        setKnowledgeBaseView(null);
        if (selectedProjectId === projectId) return;
        const targetProject = projects.find((p) => p.id === selectedProjectId);
        if (targetProject) {
            setProject(targetProject);
            const targetChannels = targetProject.channels || [];
            setChannels(targetChannels);
            const defaultChan = targetChannels.find((c) => c.name === "general") || targetChannels[0];
            if (defaultChan) {
                navigate(
                    `/tenants/${tenantId}/projects/${selectedProjectId}/channels/${defaultChan.id}`
                );
            } else {
                navigate(`/tenants/${tenantId}/projects/${selectedProjectId}`);
            }
        } else {
            navigate(`/tenants/${tenantId}/projects/${selectedProjectId}`);
        }
    };

    const openCreateProject = () => {
        setDialog("project");
        setDialogProjectId("");
        setDialogName("");
        setDialogDescription("");
        setDialogError("");
    };

    const openCreateChannel = (targetProjectId = projectId) => {
        const effectiveProjectId = targetProjectId || projectId || projects[0]?.id || "";
        setDialog("channel");
        setDialogProjectId(effectiveProjectId);
        setDialogName("");
        setDialogDescription("");
        setDialogError("");
    };

    const closeDialog = () => {
        if (!dialogLoading) {
            setDialog(null);
            setDialogError("");
        }
    };

    const handleDialogSubmit = async (event) => {
        event.preventDefault();

        const trimmedName = dialogName.trim();

        if (!trimmedName) {
            setDialogError(`${dialog === "project" ? "Project" : "Channel"} name is required.`);
            return;
        }

        try {
            setDialogLoading(true);
            setDialogError("");

            if (dialog === "project") {
                const response = await api.createProject(tenantId, {
                    name: trimmedName,
                    description: dialogDescription.trim(),
                });

                const createdProject = response.project || response.data || response;

                const refreshedProjects = await api.getProjects(tenantId);
                const updatedProjects = refreshedProjects.projects || [];
                setProjects(updatedProjects);

                if (createdProject?.id) {
                    const fullProject = updatedProjects.find((p) => p.id === createdProject.id) || createdProject;
                    setProject(fullProject);
                    setChannels(fullProject.channels || []);
                    setKnowledgeBaseView(null);
                    const defaultChan = (fullProject.channels || [])[0];
                    if (defaultChan) {
                        navigate(
                            `/tenants/${tenantId}/projects/${createdProject.id}/channels/${defaultChan.id}`
                        );
                    } else {
                        navigate(`/tenants/${tenantId}/projects/${createdProject.id}`);
                    }
                }
            } else {
                const targetProjId = dialogProjectId || projectId || projects[0]?.id;
                if (!targetProjId) {
                    setDialogError("No project selected to create channel in.");
                    return;
                }

                const response = await api.createChannel(targetProjId, {
                    name: trimmedName,
                    description: dialogDescription.trim() || undefined,
                });

                const createdChannel = response.channel || response.data || response;
                const refreshedProjects = await api.getProjects(tenantId);
                const updatedProjects = refreshedProjects.projects || [];
                setProjects(updatedProjects);

                const currentProj = updatedProjects.find((p) => p.id === targetProjId);
                if (currentProj) {
                    setProject(currentProj);
                    setChannels(currentProj.channels || []);
                }

                if (createdChannel?.id) {
                    setKnowledgeBaseView(null);
                    navigate(
                        `/tenants/${tenantId}/projects/${targetProjId}/channels/${createdChannel.id}`
                    );
                }
            }

            setDialog(null);
        } catch (submitError) {
            setDialogError(submitError.message || "Unable to complete this request.");
        } finally {
            setDialogLoading(false);
        }
    };

    if (loadingProject && projects.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#3f0e40] text-white">
                <div className="flex items-center gap-3 rounded-md bg-white/10 px-4 py-2.5 text-xs">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#2eb67d]" />
                    Loading workspace...
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen min-h-0 bg-[#3f0e40] text-[#1d1c1d]">
            {/* Left Rail (Projects icons) */}
            <aside className="hidden w-[56px] shrink-0 flex-col items-center gap-3 border-r border-white/10 bg-[#3f0e40] px-1.5 py-3 text-white md:flex">
                <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="rounded-lg outline-none ring-white/30 transition hover:ring-2 focus-visible:ring-2"
                    aria-label="Go to dashboard"
                    title="Dashboard"
                >
                    <SlackLogo />
                </button>

                <div className="h-px w-8 bg-white/20" />

                <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto no-scrollbar w-full">
                    {projects.map((candidateProject) => (
                        <button
                            key={candidateProject.id}
                            type="button"
                            onClick={() => handleProjectSelect(candidateProject.id)}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${candidateProject.id === projectId
                                    ? "bg-white text-[#3f0e40] shadow-sm"
                                    : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                            title={candidateProject.name}
                        >
                            {getInitial(candidateProject.name, "P")}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Master Panel: Projects Sidebar */}
            <aside className="relative flex w-[210px] shrink-0 flex-col bg-[#3f0e40] text-white border-r border-white/10">
                <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-tight">Projects</p>
                        <p className="truncate text-[10px] text-white/60">Workspace</p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateProject}
                        className="flex h-6 w-6 items-center justify-center rounded text-white/75 transition hover:bg-white/10 hover:text-white"
                        title="Create project"
                        aria-label="Create project"
                    >
                        <Icon className="h-3.5 w-3.5">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </Icon>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
                    <nav className="space-y-3">
                        <div className="space-y-0.5">
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard")}
                                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                            >
                                <Icon className="h-3.5 w-3.5 text-white/55">
                                    <path d="M3 11.5 12 4l9 7.5" />
                                    <path d="M5 10v10h14V10" />
                                </Icon>
                                All workspaces
                            </button>

                            <button
                                type="button"
                                onClick={openCreateProject}
                                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                            >
                                <Icon className="h-3.5 w-3.5 text-white/55">
                                    <path d="M12 5v14" />
                                    <path d="M5 12h14" />
                                </Icon>
                                New project
                            </button>
                        </div>

                        <div>
                            <div className="mb-1 flex items-center justify-between px-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                                    Projects
                                </span>
                                <button
                                    type="button"
                                    onClick={openCreateProject}
                                    className="flex h-5 w-5 items-center justify-center rounded text-white/55 hover:bg-white/10 hover:text-white"
                                    title="Create project"
                                    aria-label="Create project"
                                >
                                    <Icon className="h-3 w-3">
                                        <path d="M12 5v14" />
                                        <path d="M5 12h14" />
                                    </Icon>
                                </button>
                            </div>

                            <div className="space-y-0.5 max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar">
                                {projects.map((candidateProject) => (
                                    <button
                                        key={candidateProject.id}
                                        type="button"
                                        onClick={() => handleProjectSelect(candidateProject.id)}
                                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                                            candidateProject.id === projectId
                                                ? "bg-[#1164a3] text-white font-semibold shadow-2xs"
                                                : "text-white/72 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0 text-white/60">
                                            <path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H3z" />
                                            <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2" />
                                        </Icon>
                                        <span className="truncate">{candidateProject.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setInviteModalOpen(true)}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                                title="Invite team members"
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0 text-white/55">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </Icon>
                                <span className="truncate font-medium">Invite members</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </aside>

            {/* Slave Panel: Selected Project's Channels & Knowledge Base */}
            <aside className="relative flex w-[230px] shrink-0 flex-col bg-[#350d36] text-white border-r border-white/10">
                <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
                    <div className="min-w-0" title={project?.name || "Project"}>
                        <p className="truncate text-xs font-bold leading-tight">
                            {project?.name || "Project"}
                        </p>
                        <p className="truncate text-[10px] text-white/60">
                            {channels.length} {channels.length === 1 ? "channel" : "channels"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => openCreateChannel(projectId)}
                        className="flex h-6 w-6 items-center justify-center rounded text-white/75 transition hover:bg-white/10 hover:text-white"
                        title="Create channel in this project"
                        aria-label="Create channel in this project"
                    >
                        <Icon className="h-3.5 w-3.5">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </Icon>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
                    <nav className="space-y-3">
                        {/* Channels Section */}
                        <div>
                            <div className="mb-1 flex items-center justify-between px-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                                    Channels
                                </span>
                                <button
                                    type="button"
                                    onClick={() => openCreateChannel(projectId)}
                                    className="flex h-5 w-5 items-center justify-center rounded text-white/55 hover:bg-white/10 hover:text-white"
                                    title="Create channel"
                                    aria-label="Create channel"
                                >
                                    <Icon className="h-3 w-3">
                                        <path d="M12 5v14" />
                                        <path d="M5 12h14" />
                                    </Icon>
                                </button>
                            </div>

                            <div className="space-y-0.5 max-h-56 overflow-y-auto no-scrollbar">
                                {channels.map((channel) => (
                                    <button
                                        key={channel.id}
                                        type="button"
                                        onClick={() => handleChannelSelect(projectId, channel.id)}
                                        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition ${
                                            !knowledgeBaseView && channel.id === activeChannelId
                                                ? "bg-[#1164a3] text-white font-semibold"
                                                : "text-white/72 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        <span className="w-3.5 shrink-0 text-center text-white/55 text-xs">#</span>
                                        <span className="truncate">
                                            {formatChannelName(channel.name)}
                                        </span>
                                    </button>
                                ))}

                                {!channels.length && (
                                    <button
                                        type="button"
                                        onClick={() => openCreateChannel(projectId)}
                                        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-white/55 hover:bg-white/10 hover:text-white"
                                    >
                                        <span className="w-3.5 text-center">+</span>
                                        Create first channel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Knowledge Base Section */}
                        <div>
                            <div className="mb-1 flex items-center justify-between px-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                                    Knowledge Base
                                </span>
                            </div>

                            <div className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => setKnowledgeBaseView("docs")}
                                    className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition ${
                                        knowledgeBaseView === "docs"
                                            ? "bg-[#1164a3] text-white font-semibold"
                                            : "text-white/72 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-white/55">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </Icon>
                                    <span className="truncate">Docs</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setKnowledgeBaseView("agent-docs")}
                                    className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition ${
                                        knowledgeBaseView === "agent-docs"
                                            ? "bg-[#1164a3] text-white font-semibold"
                                            : "text-white/72 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-white/55">
                                        <rect width="18" height="14" x="3" y="5" rx="2" />
                                        <circle cx="9" cy="12" r="1.5" />
                                        <circle cx="15" cy="12" r="1.5" />
                                        <path d="M12 2v3" />
                                    </Icon>
                                    <span className="truncate">Agent Docs</span>
                                </button>
                            </div>
                        </div>
                    </nav>
                </div>
            </aside>

            {/* Main Area: Top Bar + (Chat / Private Space) */}
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                {/* Compact Top Header Bar */}
                <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#ddd] bg-[#350d36] px-3 text-white">
                    <div className="flex items-center gap-1 rounded bg-black/25 p-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveSpace("project");
                                setKnowledgeBaseView(null);
                            }}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition ${activeSpace === "project" && !knowledgeBaseView
                                    ? "bg-[#1164a3] text-white shadow-2xs"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <Icon className="h-3 w-3">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M9 21V9" />
                            </Icon>
                            <span>Project Space</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveSpace("private");
                                setKnowledgeBaseView(null);
                            }}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold transition ${activeSpace === "private" && !knowledgeBaseView
                                    ? "bg-[#1164a3] text-white shadow-2xs"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <Icon className="h-3 w-3">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </Icon>
                            <span>Private Space</span>
                        </button>
                    </div>

                    <div className="relative mx-auto hidden w-full max-w-[360px] md:block">
                        <Icon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/65 h-3.5 w-3.5">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-4-4" />
                        </Icon>
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={
                                activeSpace === "project" && activeChannel
                                    ? `Search #${formatChannelName(activeChannel.name)}`
                                    : "Search messages..."
                            }
                            className="h-7 w-full rounded border border-white/20 bg-white/15 px-8 text-xs text-white outline-none transition placeholder:text-white/65 focus:border-white/50 focus:bg-white/20"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.2 text-[10px] text-white/70 hover:bg-white/15 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {currentUser ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded bg-[#007a5a] text-[11px] font-black text-white shadow-2xs"
                                title={currentUser.email}
                            >
                                {getInitial(currentUser.name || currentUser.email, "U")}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-[11px] font-bold leading-tight text-white">
                                    {currentUser.name || currentUser.email?.split("@")[0]}
                                </p>
                                <p className="text-[9px] text-white/60 leading-none mt-0.5">
                                    {currentUser.role || "Member"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-7 shrink-0" />
                    )}
                </div>

                {knowledgeBaseView === "docs" ? (
                    <Docs
                        project={project}
                        projectId={projectId}
                        tenantId={tenantId}
                    />
                ) : knowledgeBaseView === "agent-docs" ? (
                    <AgentDocs
                        project={project}
                        projectId={projectId}
                        tenantId={tenantId}
                        agents={projectAgents}
                    />
                ) : activeSpace === "private" ? (
                    <PrivateSpace
                        tenantId={tenantId}
                        projectId={projectId}
                        activeChannelId={activeChannelId}
                        agents={availableAgents}
                        currentUser={currentUser}
                        onPushToChannel={(content) => sendMessage(content)}
                    />
                ) : activeChannel ? (
                    <>
                        <ChannelHeader
                            channel={activeChannel}
                            messageCount={messages.length}
                            detailsOpen={detailsOpen}
                            onToggleDetails={() => setDetailsOpen((value) => !value)}
                        />

                        {error || chatError ? (
                            <div className="flex items-center justify-between border-b border-[#f4c7c3] bg-[#fff5f5] px-3 py-1 text-xs text-[#b00020]">
                                <span className="truncate">{error || chatError}</span>
                                <button
                                    type="button"
                                    onClick={() => setError("")}
                                    className="ml-2 font-bold hover:underline"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : null}

                        <div className="flex min-h-0 flex-1">
                            <section className="flex min-w-0 flex-1 flex-col">
                                <MessageList
                                    messages={filteredMessages}
                                    loading={loadingMessages}
                                    channel={activeChannel}
                                    isFiltered={Boolean(searchQuery.trim())}
                                />

                                <MessageComposer
                                    channelName={formatChannelName(activeChannel.name)}
                                    onSend={sendMessage}
                                    sending={sending || executingAgent}
                                    agents={availableAgents}
                                    onExecuteTask={handleExecuteAgentTask}
                                    onProvisionAgents={handleProvisionAgents}
                                    provisioning={provisioningAgents}
                                />
                            </section>

                            {detailsOpen && (
                                <aside className="hidden w-[240px] shrink-0 border-l border-[#ddd] bg-[#f8f8f8] lg:flex flex-col h-full min-h-0 overflow-hidden">
                                    <div className="border-b border-[#ddd] px-3 py-2 shrink-0">
                                        <p className="text-xs font-bold">Details</p>
                                        <p className="text-[10px] text-[#616061] truncate">
                                            #{formatChannelName(activeChannel.name)}
                                        </p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2.5 space-y-3">
                                        <section>
                                            <h3 className="text-xs font-bold text-[#1d1c1d]">About</h3>
                                            <p className="mt-1 text-[11px] leading-4 text-[#616061]">
                                                {activeChannel.description ||
                                                    "No description has been added yet."}
                                            </p>
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-bold text-[#1d1c1d]">Project</h3>
                                            <p className="mt-1 text-xs font-semibold text-[#1d1c1d]">
                                                {project?.name || "Project"}
                                            </p>
                                            {project?.description && (
                                                <p className="mt-0.5 text-[11px] leading-4 text-[#616061]">
                                                    {project.description}
                                                </p>
                                            )}
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-bold text-[#1d1c1d]">Channels</h3>
                                            <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto no-scrollbar">
                                                {channels.map((channel) => (
                                                    <button
                                                        key={channel.id}
                                                        type="button"
                                                        onClick={() => handleChannelSelect(projectId, channel.id)}
                                                        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-xs ${channel.id === activeChannelId
                                                                ? "bg-[#e8f5fa] font-bold text-[#1264a3]"
                                                                : "text-[#616061] hover:bg-[#eee]"
                                                            }`}
                                                    >
                                                        <span>#</span>
                                                        <span className="truncate">
                                                            {formatChannelName(channel.name)}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>

                                        <ProjectAgentsPanel
                                            projectId={projectId}
                                            agents={projectAgents}
                                            onReloadAgents={loadProjectAgents}
                                        />
                                    </div>
                                </aside>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center bg-white px-4">
                        <div className="max-w-xs text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-[#f4ede4] text-xl text-[#3f0e40]">
                                #
                            </div>
                            <h2 className="mt-3 text-sm font-bold text-[#1d1c1d]">
                                No channels yet
                            </h2>
                            <p className="mt-1 text-xs text-[#616061]">
                                Create a channel to start collaborating in this project.
                            </p>
                            <button
                                type="button"
                                onClick={() => openCreateChannel(projectId)}
                                className="mt-3 rounded bg-[#007a5a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#148567]"
                            >
                                Create channel
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {dialog && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDialog();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-dialog-title"
                        className="w-full max-w-[520px] rounded-lg bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-[#ddd] px-6 py-5">
                            <div>
                                <h2 id="create-dialog-title" className="text-[22px] font-black text-[#1d1c1d]">
                                    {dialog === "project" ? "Create a project" : "Create a channel"}
                                </h2>
                                <p className="mt-1 text-sm text-[#616061]">
                                    {dialog === "project"
                                        ? "Projects group the channels your team works in."
                                        : `Add a channel under ${projects.find((candidate) => candidate.id === dialogProjectId)?.name || "this project"}.`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDialog}
                                disabled={dialogLoading}
                                className="flex h-9 w-9 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                                aria-label="Close dialog"
                            >
                                x
                            </button>
                        </div>

                        <form onSubmit={handleDialogSubmit} className="space-y-5 px-6 py-5">
                            {dialog === "channel" && projects.length > 1 && (
                                <div>
                                    <label htmlFor="dialog-project" className="mb-2 block text-sm font-black text-[#1d1c1d]">
                                        Project
                                    </label>
                                    <select
                                        id="dialog-project"
                                        value={dialogProjectId}
                                        onChange={(event) => setDialogProjectId(event.target.value)}
                                        disabled={dialogLoading}
                                        className="h-10 w-full rounded-md border border-[#868686] bg-white px-3 text-sm outline-none focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                    >
                                        {projects.map((candidateProject) => (
                                            <option key={candidateProject.id} value={candidateProject.id}>
                                                {candidateProject.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label htmlFor="dialog-name" className="mb-2 block text-sm font-black text-[#1d1c1d]">
                                    {dialog === "project" ? "Project name" : "Channel name"}
                                </label>
                                <div className="flex items-center rounded-md border border-[#868686] px-3 focus-within:border-[#1264a3] focus-within:ring-2 focus-within:ring-[#1264a3]/20">
                                    {dialog === "channel" && <span className="mr-2 text-[#616061]">#</span>}
                                    <input
                                        id="dialog-name"
                                        value={dialogName}
                                        onChange={(event) => setDialogName(event.target.value)}
                                        placeholder={dialog === "project" ? "e.g. Payment System" : "e.g. frontend"}
                                        autoFocus
                                        disabled={dialogLoading}
                                        className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[#616061]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="dialog-description" className="mb-2 block text-sm font-black text-[#1d1c1d]">
                                    Description <span className="font-normal text-[#616061]">(optional)</span>
                                </label>
                                <textarea
                                    id="dialog-description"
                                    value={dialogDescription}
                                    onChange={(event) => setDialogDescription(event.target.value)}
                                    rows={3}
                                    placeholder="Add a short description"
                                    disabled={dialogLoading}
                                    className="w-full resize-none rounded-md border border-[#868686] px-3 py-2.5 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                />
                            </div>

                            {dialogError && (
                                <p className="rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-3 py-2 text-sm text-[#b00020]">
                                    {dialogError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 border-t border-[#ddd] pt-5">
                                <button
                                    type="button"
                                    onClick={closeDialog}
                                    disabled={dialogLoading}
                                    className="rounded-md px-4 py-2 text-sm font-bold text-[#1d1c1d] hover:bg-[#f8f8f8] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={dialogLoading}
                                    className="rounded-md bg-[#007a5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {dialogLoading ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <InviteMemberModal
                isOpen={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                tenantId={tenantId}
            />
        </div>
    );
};

export default ChannelWorkspace;
