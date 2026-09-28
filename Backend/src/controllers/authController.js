import { registerUser, signInUser, signOutUser, refreshAccessToken, getCurrentUser, registerFromInvitation } from "../services/authService.js";

export const register = async (req, res) => {
    try{
        const { name, email, password } = req.body;

        const result = await registerUser({
            name,
            email,
            password
        })

        res.status(201).json({
            message: "User registered successfully",
            ...result
        })
    }
    catch(error){
        res.status(400).json({
            message: error.message
        })
    }
}

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await signInUser({
            email,
            password,
        });

        res.status(200).json({
            message: "Signed in successfully",
            ...result,
        });
    } catch (error) {
        console.error(error);

        res.status(401).json({
            message: error.message,
        });
    }
};

export const signOut = async (req, res) =>{
    try{
        const { refreshToken } = req.body;

        await signOutUser(refreshToken);

        res.status(200).json({
            message: "Signed out successfully"
        })
    } catch (error){
        console.error(error);

        res.status(400).json({
            message: error.message
        })
    }
    
};


export const refresh = async (req, res) => {
    try{
        const { refreshToken } = req.body;

        const result = await refreshAccessToken(refreshToken);

        res.status(200).json(result)
    } catch(error){
        console.error(error);

        res.status(400).json({
            message:error.message
        })
    }
}


export const me = async (req, res) =>{
    try{
        const user = await getCurrentUser(req.user.id);

        res.status(200).json({
           user
        })
    } catch(error){
        console.error(error);

        res.status(404).json({
            message:error.message
        })
    }
}


export const registerWithInvitation = async (req, res) =>{
    try{
        const { token } = req.params
        const { name, password } = req.body

        const result = await registerFromInvitation({
            token, name, password
        })

        res.status(201).json({
            message:"Account created and invitation accepted",
            ...result
        })    
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message
        })
    }
}