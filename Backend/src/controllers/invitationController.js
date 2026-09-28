import {
    createInvitation,
    getInvitationByToken,
    acceptInvitation,
    joinWithInvitation,
} from "../services/invitationService.js";

export const create = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { email } = req.body;

        const invitation = await createInvitation({
            tenantId,
            email,
            userId: req.user.id,
        });

        res.status(201).json({
            message: "Invitation created and email sent successfully",
            invitation,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
};

export const getDetails = async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await getInvitationByToken(token);

        res.status(200).json({
            invitation,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
};

export const accept = async (req, res) => {
    try {
        const { token } = req.params;

        const result = await acceptInvitation({
            token,
            userId: req.user.id,
        });

        res.status(200).json({
            message: "Invitation accepted successfully",
            result,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
};

export const join = async (req, res) => {
    try {
        const { token } = req.params;
        const { name, password } = req.body;

        const result = await joinWithInvitation({
            token,
            name,
            password,
        });

        res.status(200).json({
            message: "Joined organization successfully",
            ...result,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
};