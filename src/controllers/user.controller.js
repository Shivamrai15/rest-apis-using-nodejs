import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/api-response.js";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave : false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

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

export const loginUser = asyncHandler(async(req, res, next)=>{

    const { username, email, password } = req.json();

    if (!username || !email) {
        throw new ApiError(400, "Fields re required");
    }

    const user = await User.findOne({
        $or : [
            username,
            email
        ]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect Password");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);
    
    const loggedInUser = {
        _id : user._id,
        fullname : user.fullname,
        email : user.email,
        avatar : user.avatar,
        coverImage : user.coverImage,
        watchHistory : user.watchHistory,
        createdAt : user.createdAt,
        updatedAt: user.updatedAt
    }

    const options  = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, loggedInUser, "User has been loggedIn successfully")
    )

});

