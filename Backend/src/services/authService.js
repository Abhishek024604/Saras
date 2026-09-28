import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js"
import {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiry,
} from "./tokenService.js";

export const registerUser = async ({name, email, password}) =>{
    // check if user exists
    const existingUser = await prisma.user.findUnique({
        where:{
            email,
        }
    });

    if(existingUser){
        throw new Error("User already exists")
    }

    //hash password
    const passwordHash = await bcrypt.hash(password, 10)

    //create user
    const user = await prisma.user.create({
        data:{

            name,
            email,
            passwordHash
        }
    })

    const accessToken = generateAccessToken(user.id);

    const refreshToken = generateRefreshToken();

    const refreshTokenHash = hashRefreshToken(refreshToken);

    //generate jwt token
    await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash,
            expiresAt: getRefreshTokenExpiry(),
        },
    });

    //return user
    return {
        user:{
            id:user.id,
            name:user.name,
            email:user.email,
        },
        accessToken,
        refreshToken
    }
}


export const signInUser = async ({email, password}) => {
    // check if user exists
    const user = await prisma.user.findUnique({
        where:{
            email,
        }
    })

    if(!user){
        throw new Error("User does not exist")
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if(!isPasswordValid){
        throw new Error("Invalid password")
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken()
    const refreshTokenHash = hashRefreshToken(refreshToken)
    
    await prisma.session.create({
        data:{
            userId: user.id,
            refreshTokenHash,
            expiresAt: getRefreshTokenExpiry()
        }
    })

    return {
        user:{
            id:user.id,
            name:user.name,
            email:user.email,
        },
        accessToken,
        refreshToken
    }
}


export const signOutUser = async (refreshToken) => {
    if(!refreshToken) {
        throw new Error("Refresh token is required");
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({
        where:{
            refreshTokenHash,
        }
    })

    if(!session){
        throw new Error("Invalid refresh token")
    }

    await prisma.session.delete({
        where:{
            id:session.id
        }
    })
}

export const refreshAccessToken = async (refreshToken) =>{
    if(!refreshToken){
        throw new Error("Refresh token is required");
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({
        where:{
            refreshTokenHash,
        }
    })

    if(!session){
        throw new Error("Invalid refresh token")
    }

    if(session.expiresAt < new Date()){
        await prisma.session.delete({
            where:{
                id: session.id,
            }
        })

        throw new Error("Refresh token has expired")
    }

    const accessToken = generateAccessToken(session.userId);

    return {
        accessToken,
    }
}

export const getCurrentUser = async (userId) =>{
    const user = await prisma.user.findUnique({
        where:{
            id:userId
        },
        select:{
            id:true,
            name:true,
            email:true,
            createdAt:true
        }
    })

    if(!user){
        throw new Error("User not found")
    }

    return user;
}


export const registerFromInvitation = async ({ token, name, password }) => {
    //1.hash invitation token
    const tokenHash = hashRefreshToken(token)

    //2.find invitation 
    const invitation = await prisma.invitation.findUnique({
        where:{
            tokenHash
        }
    })

    if(!invitation){
        throw new Error("Invalid Invitation")
    }

    //3.check invitation status
    if(invitation.status !== "PENDING"){
        throw new Error("Invitation is no longer valid")
    }

    //4.check expiration
    if(new Date() > invitation.expiresAt){
        await prisma.invitation.update({
            where:{
                id: invitation.id,
            },
            data:{
                status: "EXPIRED"
            }
        })

        throw new Error("Invitation has expired")
    }

    //5. check whether an account already exists
    const existingUser = await prisma.user.findUnique({
        where:{
            email:invitation.email
        }
    })

    if(existingUser){
        throw new Error("An account already exists with this email. Please sign in and accept the invitation")
    }

    //6.hash password
    const passwordHash = await bcrypt.hash(password, 12)

    //7.create user + membership + accept invitation
    const result = await prisma.$transaction(async (tx) =>{
        const user = await tx.user.create({
            data:{
                name,
                email: invitation.email,
                passwordHash
            }
        });

        const membership = await tx.membership.create({
            data:{
                userId:user.id,
                tenantId:invitation.tenantId,
                role: "MEMBER"
            }
        })

        await tx.invitation.update({
            where:{
                id:invitation.id
            },
            data:{
                status:"ACCEPTED",
                acceptedAt: new Date()
            }
        })

        return {
            user, 
            membership
        }
    })

    //8.generate authentication tokens
    const accessToken = generateAccessToken(result.user.id)

    const refreshToken = generateRefreshToken();

    const refreshTokenHash = hashRefreshToken(refreshToken)

    await prisma.session.create({
        data:{
            userId:result.user.id,
            refreshTokenHash,
            expiresAt: getRefreshTokenExpiry()
        }
    })

    return {
        user:{
            id: result.user.id,
            name:result.user.name,
            email:result.user.email
        },
        membership:result.membership,
        accessToken,
        refreshToken
    }
}