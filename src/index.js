import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config();

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000);
    console.log(`Server is running on http://localhost:${process.env.PORT}`)
})
.catch((error)=>{
    console.error("MongoDB Connection Error", error);
});