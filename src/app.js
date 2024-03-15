import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
}));
app.use(express.json({
    limit : "16kb",
}));
app.use(express.urlencoded({
    extended : true,
    limit : "16kb"
}));
app.use(express.static("public"));
app.use(cookieParser());

// Routes import

import userRouter from "./routes/user.router.js";

// Routes declaration

app.use("/api/v1/users", userRouter);

export { app }