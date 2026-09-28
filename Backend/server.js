import express from 'express'
import cors from 'cors'
import prisma from "./src/config/db.js"
import authRoutes from "./src/routes/authRoutes.js"
import membershipRoutes from "./src/routes/membershipRoutes.js"
import tenantRoutes from "./src/routes/tenantRoutes.js"
import invitationRoutes from "./src/routes/invitationRoutes.js"
import projectRoutes from "./src/routes/projectRoutes.js";
import channelRoutes from "./src/routes/channelRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import http from "http";
import { initializeSocket } from "./src/socket/socketServer.js";
import agentRoutes from "./src/routes/agentRoutes.js";
import docRoutes from "./src/routes/docRoutes.js";

const app = express()

const PORT = Number(process.env.PORT) || 5000

//middleware
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}))

app.use("/api/auth", authRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/tenants", invitationRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/tenants", projectRoutes)
app.use("/api/projects", channelRoutes)
app.use("/api/projects", docRoutes);
app.use("/api/channels", messageRoutes);
app.use("/api", agentRoutes);

app.get("/", (req, res) =>{
    res.json({
        message: "Backend is running!"
    })
})

app.get("/db-test", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            message: "Database connected successfully"
        })
    } catch(error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        })
    }
})

const httpServer = http.createServer(app);
initializeSocket(httpServer);

//start server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

