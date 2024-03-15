export const asyncHandler =  ( func ) => async(req, res, next) =>{
    try {
        return await func(req, res, next);
    } catch (error) {
        return res.status(error.code || 500).json({
            success : false,
            message : error.message 
        });
    }
}