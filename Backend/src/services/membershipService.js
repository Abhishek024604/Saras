import prisma from "../config/db.js";

export const getUserMemberships = async (userId) =>{
    const memberships = await prisma.membership.findMany({
        where:{
            userId
        },
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    _count: {
                        select: { memberships: true },
                    },
                },
            },
        },
        orderBy:{
            createdAt:"asc"
        }
    })

    return memberships
}