import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { sendInvitationEmail } from "./mailService.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiry,
} from "./tokenService.js";

const INVITATION_EXPIRY_DAYS = 5;

const normalizeEmail = (email) => {
    return email?.trim().toLowerCase() || "";
};

export const createInvitation = async ({ tenantId, email, userId }) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error("Please provide a valid email address");
    }

    // 1. Verify that requester is a member of this tenant
    const membership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId,
            },
        },
        include: {
            user: {
                select: {
                    name: true,
                },
            },
            tenant: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!membership) {
        throw new Error("You are not a member of this organization");
    }

    // 2. Allow OWNER and ADMIN to create invitations
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
        throw new Error("Only organization owners and admins can send invitations");
    }

    // 3. Check if this email is already a member
    const existingUser = await prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });

    if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
            where: {
                userId_tenantId: {
                    userId: existingUser.id,
                    tenantId,
                },
            },
        });

        if (existingMembership) {
            throw new Error("This user is already a member of this organization");
        }
    }

    // 4. Generate the raw invitation token & hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    // 5. Expiration time
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // 6. Check for existing pending invitation to update, or create new
    const existingInvitation = await prisma.invitation.findFirst({
        where: {
            tenantId,
            email: normalizedEmail,
            status: "PENDING",
        },
    });

    let invitation;
    if (existingInvitation) {
        invitation = await prisma.invitation.update({
            where: { id: existingInvitation.id },
            data: {
                tokenHash,
                expiresAt,
            },
        });
    } else {
        invitation = await prisma.invitation.create({
            data: {
                tenantId,
                email: normalizedEmail,
                tokenHash,
                expiresAt,
            },
        });
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationLink = `${frontendBaseUrl}/invite/${rawToken}`;

    // 7. Send invitation email via SMTP
    const emailDelivery = await sendInvitationEmail({
        to: normalizedEmail,
        inviterName: membership.user?.name || "A team admin",
        tenantName: membership.tenant?.name || "Workspace",
        invitationLink,
        expiresAt,
    });

    return {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        invitationLink,
        emailDelivery,
    };
};

/**
 * Public details about an invitation token (for the recipient join screen)
 */
export const getInvitationByToken = async (token) => {
    if (!token) {
        throw new Error("Invitation token is required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await prisma.invitation.findUnique({
        where: {
            tokenHash,
        },
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
    });

    if (!invitation) {
        throw new Error("Invitation not found or link is invalid");
    }

    if (invitation.status !== "PENDING") {
        throw new Error(`This invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (new Date() > invitation.expiresAt) {
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        throw new Error("This invitation has expired");
    }

    // Check if the recipient already has a Workly account
    const user = await prisma.user.findUnique({
        where: {
            email: invitation.email,
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
    });

    return {
        email: invitation.email,
        tenant: invitation.tenant,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        userExists: !!user,
        userName: user?.name || null,
    };
};

/**
 * Accepts an invitation when the user is already authenticated
 */
export const acceptInvitation = async ({ token, userId }) => {
    if (!token) {
        throw new Error("Invitation token is required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await prisma.invitation.findUnique({
        where: {
            tokenHash,
        },
        include: {
            tenant: true,
        },
    });

    if (!invitation) {
        throw new Error("Invalid invitation");
    }

    if (invitation.status !== "PENDING") {
        throw new Error("Invitation is no longer valid");
    }

    if (new Date() > invitation.expiresAt) {
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        throw new Error("Invitation has expired");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error(
            `This invitation was issued to ${invitation.email}. You are logged in as ${user.email}.`
        );
    }

    const existingMembership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId: invitation.tenantId,
            },
        },
    });

    const result = await prisma.$transaction(async (tx) => {
        let membership = existingMembership;
        if (!membership) {
            membership = await tx.membership.create({
                data: {
                    userId,
                    tenantId: invitation.tenantId,
                    role: "MEMBER",
                },
            });
        }

        await tx.invitation.update({
            where: { id: invitation.id },
            data: {
                status: "ACCEPTED",
                acceptedAt: new Date(),
            },
        });

        // Automatically enroll the user in all projects in this organization
        const tenantProjects = await tx.project.findMany({
            where: { tenantId: invitation.tenantId },
            select: { id: true },
        });

        for (const proj of tenantProjects) {
            await tx.projectMembership.upsert({
                where: {
                    projectId_userId: {
                        projectId: proj.id,
                        userId,
                    },
                },
                update: {},
                create: {
                    projectId: proj.id,
                    userId,
                },
            });
        }

        return {
            membership,
            tenant: invitation.tenant,
            alreadyMember: !!existingMembership,
        };
    });

    return result;
};

/**
 * Accepts an invitation and signs in / registers the user in one step
 * so that ANYONE can join directly from the invitation link!
 */
export const joinWithInvitation = async ({ token, name, password }) => {
    if (!token) {
        throw new Error("Invitation token is required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await prisma.invitation.findUnique({
        where: { tokenHash },
        include: { tenant: true },
    });

    if (!invitation) {
        throw new Error("Invalid or expired invitation link");
    }

    if (invitation.status !== "PENDING") {
        throw new Error(`This invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (new Date() > invitation.expiresAt) {
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        throw new Error("This invitation has expired");
    }

    let user = await prisma.user.findUnique({
        where: { email: invitation.email },
    });

    if (user) {
        // User already has an account -> verify password
        if (!password) {
            throw new Error("Password is required to sign in and join");
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Incorrect password for this account");
        }
    } else {
        // New user -> register on-the-fly
        if (!name || !name.trim()) {
            throw new Error("Full name is required to create your account");
        }
        if (!password || password.length < 6) {
            throw new Error("Password must be at least 6 characters long");
        }

        const passwordHash = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: invitation.email,
                passwordHash,
            },
        });
    }

    // Add membership and accept invitation
    const existingMembership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId: user.id,
                tenantId: invitation.tenantId,
            },
        },
    });

    await prisma.$transaction(async (tx) => {
        if (!existingMembership) {
            await tx.membership.create({
                data: {
                    userId: user.id,
                    tenantId: invitation.tenantId,
                    role: "MEMBER",
                },
            });
        }

        await tx.invitation.update({
            where: { id: invitation.id },
            data: {
                status: "ACCEPTED",
                acceptedAt: new Date(),
            },
        });

        // Automatically enroll the user in all projects in this organization
        const tenantProjects = await tx.project.findMany({
            where: { tenantId: invitation.tenantId },
            select: { id: true },
        });

        for (const proj of tenantProjects) {
            await tx.projectMembership.upsert({
                where: {
                    projectId_userId: {
                        projectId: proj.id,
                        userId: user.id,
                    },
                },
                update: {},
                create: {
                    projectId: proj.id,
                    userId: user.id,
                },
            });
        }
    });

    // Generate auth tokens and session
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash,
            expiresAt: getRefreshTokenExpiry(),
        },
    });

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
        tenant: invitation.tenant,
        accessToken,
        refreshToken,
    };
};