import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import TenantWorkspace from "./pages/tenant/TenantWorkspace";
import CreateProject from "./pages/project/CreateProject";
import CreateChannel from "./pages/channel/CreateChannel";
import ChannelWorkspace from "./pages/channel/ChannelWorkspace";
import Docs from "./pages/knowledgeBase/Docs";
import AgentDocs from "./pages/knowledgeBase/AgentDocs";
import AcceptInvite from "./pages/invitation/AcceptInvite";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tenants/new" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/tenants/:tenantId"
          element={<TenantWorkspace />}
        />
        <Route
          path="/tenants/:tenantId/projects/new"
          element={<CreateProject />}
        />
        <Route
          path="/tenants/:tenantId/projects/:projectId/channels/new"
          element={<CreateChannel />}
        />
        <Route
          path="/tenants/:tenantId/projects/:projectId"
          element={<ChannelWorkspace />}
        />

        <Route
          path="/tenants/:tenantId/projects/:projectId/channels/:channelId"
          element={<ChannelWorkspace />}
        />
        <Route
          path="/tenants/:tenantId/projects/:projectId/docs"
          element={<Docs />}
        />
        <Route
          path="/tenants/:tenantId/projects/:projectId/agent-docs"
          element={<AgentDocs />}
        />
        <Route
          path="/tenants/:tenantId/docs"
          element={<Docs />}
        />
        <Route
          path="/tenants/:tenantId/agent-docs"
          element={<AgentDocs />}
        />
        <Route path="/docs" element={<Docs />} />
        <Route path="/agent-docs" element={<AgentDocs />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App
