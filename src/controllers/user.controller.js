import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/api-response.js";


export const registerUser = asyncHandler (async(req, res, next)=>{
    const { fullname, username, email, password } = req.body;
    
    if (!fullname || !username || !email || !password) {
        throw new ApiError(400, "field are required");
    }

    const existingUser  = await User.findOne({
        '$or' : [ {username}, {email} ]
    });

    if (existingUser) {
        throw new ApiError(409, "User with email or username already exist");
    }

    const avatarLocalpath = req.files?.avatar[0]?.path;
    let coverImageLocalpath;

    if (req.files  && Array.isArray(req.files.coverImage) && (req.files.coverImage.length > 0) ) {
        coverImageLocalpath = req.files.coverImage[0].path;
    }

    if (!avatarLocalpath) {
        throw new ApiError(404, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalpath);
    const coverImage = await uploadOnCloudinary(coverImageLocalpath);

    if ( !avatar ) {
        throw new ApiError(500, "Internal server error");
    }

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        email,
        password,
        coverImage : coverImage?.url || "",
        username : username.toLowerCase(),
    });

    if (!user) {
        throw new ApiError(500, "Internal server error");
    }

    const constrainedUser = {
        _id : user._id,
        fullname : user.fullname,
        email : user.email,
        avatar : user.avatar,
        coverImage : user.coverImage,
        watchHistory : user.watchHistory,
        createdAt : user.createdAt,
        updatedAt: user.updatedAt
    }

    return res.status(201).json(
        new ApiResponse(200, constrainedUser, "User has been created successfully")
    )

});

