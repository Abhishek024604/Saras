import { getUserMemberships } from "../services/membershipService.js";

export const getMyMemberships = async (req, res)=>{
    try{
        const memberships = await getUserMemberships(req.user.id)

        res.status(200).json({
            memberships
        })
    } catch(error){
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch memberships"
        })

    }
}