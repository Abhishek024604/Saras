import prisma from "../config/db.js"

export const createTenant = async ({ name, userId }) =>{
    const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

    const existingTenant = await prisma.tenant.findUnique({
        where:{
            slug,
        }
    })

    if(existingTenant){
        throw new Error("Tenant with same name already exists")
    }

    const result = await prisma.$transaction(async (tx) =>{
        const tenant = await tx.tenant.create({
            data:{
                name,
                slug,
            }
        })

        const membership = await tx.membership.create({
            data:{
               userId,
               tenantId: tenant.id,
               role: "OWNER"
            }
        })

        return {
            tenant,
            membership,
        }
    })

    return result

}

export const getUserTenant = async ({ tenantId, userId }) => {
    const membership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId,
            },
        },
        include: {
            tenant: true,
        },
    });

    if (!membership) {
        throw new Error("You are not a member of this tenant");
    }

    return {
        ...membership.tenant,
        role: membership.role,
    };
};