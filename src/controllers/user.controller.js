import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/api-response.js";
import jwt from "jsonwebtoken";

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

export const registerUser = asyncHandler (async(req, res)=>{
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

export const loginUser = asyncHandler(async(req, res)=>{

    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({
        email
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

export const logoutUser = asyncHandler ( async(req, res, next) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    );

    const options  = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfullly"));
});

export const refershAccessToken = asyncHandler( async(req, res)=>{

    const incomingRefreshToken = req.cookie.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, "Invalid refersh token")
    }

    if ( incomingRefreshToken !==  user?.refreshToken ) {
        throw new ApiError(401, "Refresh token is expired" );
    }

    const options  = {
        httpOnly : true,
        secure : true
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);

    return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
        new ApiResponse(
            200,
            {refreshToken, accessToken},
            "Access Token Refreshed"
            )
    );

} )