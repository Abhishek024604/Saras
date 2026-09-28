# Saras (Workly) - Multi-Tenant Workspace & Collaboration Platform

A Slack-inspired multi-tenant collaborative workspace application featuring project management, real-time socket chat, document knowledge bases with custom categories, AI agent execution tasks, and seamless organization invitations via SMTP.

---

## 🚀 Features

- **Multi-Tenant Architecture**: Strict organization boundaries with roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Project & Channel Management**: Master-detail project navigation with dedicated channels and real-time chat via WebSockets (Socket.IO).
- **Knowledge Base (Docs)**: Multi-section document store (Design Docs, Testing Docs, Review Docs, and custom user-created sections) with file attachments and markdown previews.
- **AI Agent Integration**: Project-level AI agents for code reviews, testing, automation, and task execution directly inside channels.
- **Team Invitations & Onboarding**:
  - Direct organization invitations dispatched via SMTP (e.g., Gmail SMTP or sandbox).
  - 1-click invitation acceptance for existing accounts.
  - Seamless on-the-fly registration and workspace enrollment for new invitees.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), React Router, Tailwind CSS, Lucide Icons, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, Prisma ORM, PostgreSQL, Nodemailer, JSON Web Tokens (JWT)

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### 1. Backend Setup
```bash
cd Backend
npm install
cp .env.example .env
# Update .env with your PostgreSQL DATABASE_URL and optional SMTP credentials
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
cd MultiTenantArchitecture
npm install
npm run dev
```

Visit `http://localhost:5173` to get started!
