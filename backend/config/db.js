import mongoose from "mongoose";

const connectDB = async () => {
    try {
         // mongoose.connect returns a promise, so we await it
        const conn = await mongoose.connect(process.env.MONGO_URI)

         // conn.connection.host tells us which MongoDB server we connected to
        console.log(`✅ MongoDB connected: ${conn.connection.host}`)
    } 
    catch (err) {
        // If connection fails, log the error and exit the process
        console.error(`❌ MongoDB connection error: ${err.message}`)

        // process.exit(1) means "exit with failure"
        process.exit(1)
    }
}

export default connectDB