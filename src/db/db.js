import mongoose from "mongoose";

const connectDB = async () => {
    try {

        const connection = await mongoose.connect(`${process.env.DATABASE_URL}`);
        console.log("MongoDB connected on ", connection.connection.host);
        
    } catch (error) {
        console.error("MONGODB CONNECTION ERROR", error);
        process.exit(1);
    }
}

export default connectDB;