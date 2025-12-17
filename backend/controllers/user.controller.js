import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import fs from "fs";

const convertUserDataToPDF = async (userData) => {
  const doc = new PDFDocument();

  const outputPath = crypto.randomBytes(16).toString("hex") + ".pdf";
  const stream = fs.createWriteStream("uploads/" + outputPath);

  doc.pipe(stream);

  doc.image(`uploads/${userData.userId.profilePicture}`, {
    align: "center",
    width: 100,
  });

  doc.fontSize(14).text(`Name: ${userData.userId.name}`);
  doc.fontSize(14).text(`Username: ${userData.userId.username}`);
  doc.fontSize(14).text(`Email: ${userData.userId.email}`);
  doc.fontSize(14).text(`Bio: ${userData.bio || "N/A"}`);

  doc.fontSize(14).text("Past Experiences:");
  userData.pastWork.forEach((exp, index) => {
    doc.fontSize(12).text(`Company Name: ${exp.company}`);
    doc.fontSize(12).text(`Position: ${exp.position}`);
    doc.fontSize(12).text(`Years: ${exp.years}`);
  });

  doc.end();

  return outputPath;
};

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

    const profile = new Profile({ userId: newUser._id });
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

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Save token properly
    user.token = token;
    await user.save();

    return res.json({ token });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const uploadProfilePicture = async (req, res) => {
  try {
    // Check file first
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Extract token from headers (NOT body)
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Save file name
    user.profilePicture = req.file.filename;
    await user.save();

    return res.json({
      message: "Profile picture updated successfully",
      profilePicture: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { token, ...newUserData } = req.body;
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, email } = newUserData;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser || string(existingUser._id) !== string(user._id)) {
        return res
          .status(409)
          .json({ message: "Username or Email already in use" });
      }
    }

    Object.assign(user, newUserData);
    await user.save();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUserAndProfile = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userProfile = await Profile.findOne({ userId: user._id }).populate(
      "userId",
      "name email username profilePicture"
    );

    return res.json(userProfile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfileData = async (req, res) => {
  try {
    const { token, ...newprofileData } = req.body;

    const userProfile = await User.findOne({ token: token });
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile_to_update = await Profile.findOne({
      userId: userProfile._id,
    });

    Object.assign(profile_to_update, newprofileData);
    await profile_to_update.save();
    return res.json({ message: "Profile updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllUserProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find().populate(
      "userId",
      "name email username profilePicture"
    );
    return res.json(profiles);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const downloadProfile = async (req, res) => {
  const user_id = req.query.id;
  const userProfile = await Profile.findOne({ userId: user_id }).populate(
    "userId",
    "name email username profilePicture"
  );
  let outputPath = await convertUserDataToPDF(userProfile);

  return res.json({ message: outputPath });
};
