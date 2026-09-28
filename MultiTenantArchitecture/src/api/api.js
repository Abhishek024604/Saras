const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const apiRequest = async (endpoint, options = {}, retry = true) => {
    const accessToken = localStorage.getItem("accessToken");

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",

                ...(accessToken && {
                    Authorization: `Bearer ${accessToken}`,
                }),

                ...options.headers,
            },
            credentials: "include",
        }
    );

    /*
     * Access token expired.
     * Try to refresh it and retry the original request.
     */
    const isAuthenticationRequest =
        endpoint === "/auth/signin" ||
        endpoint === "/auth/register" ||
        endpoint === "/auth/refresh";

    if (
        response.status === 401 &&
        retry &&
        !isAuthenticationRequest
    ) {
        try {
            const refreshResponse = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        refreshToken: localStorage.getItem("refreshToken"),
                    }),
                    credentials: "include",
                }
            );

            const refreshData = await refreshResponse
                .json()
                .catch(() => ({}));

            if (!refreshResponse.ok || !refreshData.accessToken) {
                throw new Error("Refresh token expired");
            }

            localStorage.setItem(
                "accessToken",
                refreshData.accessToken
            );

            // Retry the original request once.
            return apiRequest(endpoint, options, false);
        } catch (error) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");

            window.location.href = "/login";

            throw new Error(
                "Session expired. Please login again."
            );
        }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || "Something went wrong"
        );
    }

    return data;
};


const api = {
    // =========================
    // AUTH
    // =========================

    register: (userData) =>
        apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData),
        }),

    login: (credentials) =>
        apiRequest("/auth/signin", {
            method: "POST",
            body: JSON.stringify(credentials),
        }),

    logout: () =>
        apiRequest("/auth/signout", {
            method: "POST",
            body: JSON.stringify({
                refreshToken: localStorage.getItem("refreshToken"),
            }),
        }),

    refreshToken: () =>
        apiRequest("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({
                refreshToken: localStorage.getItem("refreshToken"),
            }),
        }),

    getCurrentUser: () =>
        apiRequest("/auth/me", {
            method: "GET",
        }),


    // =========================
    // MEMBERSHIPS
    // =========================

    getMemberships: () =>
        apiRequest("/memberships", {
            method: "GET",
        }),


    // =========================
    // TENANTS / ORGANIZATIONS
    // =========================

    createTenant: (tenantData) =>
        apiRequest("/tenants", {
            method: "POST",
            body: JSON.stringify(tenantData),
        }),

    getTenant: (tenantId) =>
        apiRequest(`/tenants/${tenantId}`, {
            method: "GET",
        }),

    getTenantProjects: (tenantId) =>
        apiRequest(`/tenants/${tenantId}/projects`, {
            method: "GET",
        }),

    createInvitation: (tenantId, email) =>
        apiRequest(`/tenants/${tenantId}/invitations`, {
            method: "POST",
            body: JSON.stringify({ email }),
        }),

    getInvitation: (token) =>
        apiRequest(`/tenants/invitations/${token}`, {
            method: "GET",
        }),

    acceptInvitation: (token) =>
        apiRequest(`/tenants/invitations/${token}/accept`, {
            method: "POST",
        }),

    joinInvitation: (token, payload) =>
        apiRequest(`/tenants/invitations/${token}/join`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),


    // =========================
    // PROJECTS
    // =========================

    getProjects: (tenantId) =>
        apiRequest(`/tenants/${tenantId}/projects`, {
            method: "GET",
        }),

    createProject: (tenantId, projectData) =>
        apiRequest(`/tenants/${tenantId}/projects`, {
            method: "POST",
            body: JSON.stringify(projectData),
        }),

    getProject: (projectId) =>
        apiRequest(`/projects/${projectId}`, {
            method: "GET",
        }),


    // =========================
    // CHANNELS
    // =========================


    createChannel: (projectId, payload) =>
        apiRequest(`/projects/${projectId}/channels`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),




    // =========================
    // MESSAGES
    // =========================

    getChannelMessages: (channelId, limit = 50) =>
        apiRequest(
            `/channels/${channelId}/messages?limit=${limit}`,
            {
                method: "GET",
            }
        ),

    sendChannelMessage: (channelId, content) =>
        apiRequest(`/channels/${channelId}/messages`, {
            method: "POST",
            body: JSON.stringify({
                content,
            }),
        }),


    // =========================
    // AGENT DEFINITIONS
    // =========================

    getAgentDefinitions: () =>
        apiRequest("/agent-definitions", {
            method: "GET",
        }),


    // =========================
    // PROJECT AGENTS
    // =========================

    getProjectAgents: (projectId) =>
        apiRequest(`/projects/${projectId}/agents`, {
            method: "GET",
        }),

    getProjectAgent: (projectAgentId) =>
        apiRequest(`/project-agents/${projectAgentId}`, {
            method: "GET",
        }),

    updateProjectAgent: (projectAgentId, payload) =>
        apiRequest(`/project-agents/${projectAgentId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        }),

    provisionProjectAgents: (projectId) =>
        apiRequest(`/projects/${projectId}/agents/provision`, {
            method: "POST",
        }),


    // =========================
    // AGENT TASK EXECUTION
    // =========================

    executeAgentTask: ({
        projectAgentId,
        channelId,
        task,
    }) =>
        apiRequest("/agent-tasks/execute", {
            method: "POST",
            body: JSON.stringify({
                projectAgentId,
                channelId,
                task,
            }),
        }),

    // =========================
    // KNOWLEDGE BASE / DOCS & SECTIONS
    // =========================

    getProjectDocSections: (projectId) =>
        apiRequest(`/projects/${projectId}/doc-sections`, {
            method: "GET",
        }),

    createProjectDocSection: (projectId, payload) =>
        apiRequest(`/projects/${projectId}/doc-sections`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    deleteProjectDocSection: (projectId, sectionId) =>
        apiRequest(`/projects/${projectId}/doc-sections/${sectionId}`, {
            method: "DELETE",
        }),

    getProjectDocs: (projectId, sectionId) =>
        apiRequest(
            `/projects/${projectId}/docs${
                sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : ""
            }`,
            {
                method: "GET",
            }
        ),

    getProjectDoc: (projectId, docId) =>
        apiRequest(`/projects/${projectId}/docs/${docId}`, {
            method: "GET",
        }),

    createProjectDoc: (projectId, payload) =>
        apiRequest(`/projects/${projectId}/docs`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    deleteProjectDoc: (projectId, docId) =>
        apiRequest(`/projects/${projectId}/docs/${docId}`, {
            method: "DELETE",
        }),
};


export { apiRequest };

export default api;