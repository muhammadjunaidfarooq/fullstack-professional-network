import User from "../models/user.model.js";
import Profiler from "../models/profile.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const register = async (req, res) => {
  // console.log("Request Body:", req.body);
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      username,
    });
    await newUser.save();
    // console.log("User saved:", newUser);

    const profile = new Profiler({ userId: newUser._id });
    await profile.save();
    // console.log("Profile saved:", profile);

    return res.status(201).json({
      message: "User Created",
      user: { id: newUser._id, name, username, email },
      profileId: profile._id,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(404).json({ message: "Invalid Credentials" });

    const token = crypto.randomBytes(32).toString("hex");

    await user.updateOne({ userId: user._id }, { token });

    return res.json({ token });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
