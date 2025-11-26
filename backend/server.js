import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import postRoutes from "./routes/posts.routes.js";

dotenv.config();

const app = express();

console.log(process.env.MONGO_URI);

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/posts", postRoutes);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    app.listen(9090, () => {
      console.log("Server is running on port 9090");
    });
  } catch (error) {
    console.log("Error connecting to MongoDB:", error.message);
  }
};

start();
