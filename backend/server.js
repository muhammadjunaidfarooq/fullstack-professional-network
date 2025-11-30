import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import postRoutes from "./routes/posts.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(postRoutes);
app.use(userRoutes);

const start = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://junaidfarooqpk_db_user:D8Nnb2vstjR7jhrc@social-media-platform.gtr7omj.mongodb.net/?appName=social-media-platform"
    );
    console.log("MongoDB Connected");

    app.listen(9090, () => {
      console.log("Server is running on port 9090");
    });
  } catch (error) {
    console.log("Error connecting to MongoDB:", error.message);
  }
};

start();
