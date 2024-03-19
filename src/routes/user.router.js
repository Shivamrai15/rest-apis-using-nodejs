import { Router } from "express";
import { loginUser, logoutUser, refershAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
    "/register", 
    upload.fields([
        {
            name : "avatar",
            maxCount : 1,
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ])
    ,registerUser
);

router.post("/login", loginUser);


// SECURED ROUTES
router.route("/logout", verifyJWT, logoutUser);
router.route("/refresh-token", refershAccessToken);

export default router;