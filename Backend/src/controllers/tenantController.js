import { createTenant, getUserTenant } from "../services/tenantService.js"

export const create = async (req, res) =>{
    try{
        const { name } = req.body

        const result = await createTenant({
            name, 
            userId: req.user.id
        })

        res.status(201).json({
            message: "Tenant created successfully",
            ...result
        })
    } catch(error){
        console.error(error)
        res.status(500).json({
            message: error.message
        })
    }
}

export const get = async (req, res) => {
    try {
        const tenant = await getUserTenant({
            tenantId: req.params.tenantId,
            userId: req.user.id,
        });

        res.status(200).json({ tenant });
    } catch (error) {
        console.error(error);
        res.status(403).json({
            message: error.message,
        });
    }
};