/**
 * Fill the database with a few demo users, connections and posts.
 *
 *   npm run seed            # adds demo data (skips users that already exist)
 *
 * Every demo account uses the password "password123".
 * Refuses to run when NODE_ENV=production unless you pass --force.
 */
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { assertRequiredEnv, env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";
import ConnectionRequest from "../models/connections.model.js";

const PASSWORD = "password123";

const DEMO_USERS = [
  {
    name: "Ayesha Khan",
    username: "ayesha.khan",
    email: "ayesha@example.com",
    profile: {
      currentPost: "Senior Frontend Engineer at Nimbus Labs",
      location: "Lahore, Pakistan",
      bio: "I build fast, accessible web apps with React and Next.js. Mentor at local coding bootcamps.",
      skills: ["React", "Next.js", "TypeScript", "Accessibility", "CSS"],
      pastWork: [
        { company: "Nimbus Labs", position: "Senior Frontend Engineer", years: "2023 – Present" },
        { company: "PixelCraft", position: "Frontend Developer", years: "2020 – 2023" },
      ],
      education: [
        { school: "FAST NUCES", degree: "BS", fieldOfStudy: "Computer Science", years: "2016 – 2020" },
      ],
    },
  },
  {
    name: "Bilal Ahmed",
    username: "bilal.ahmed",
    email: "bilal@example.com",
    profile: {
      currentPost: "Backend Engineer · Node.js & MongoDB",
      location: "Karachi, Pakistan",
      bio: "APIs, databases and distributed systems. Currently scaling payment services.",
      skills: ["Node.js", "Express", "MongoDB", "Redis", "Docker"],
      pastWork: [{ company: "PayFlow", position: "Backend Engineer", years: "2022 – Present" }],
      education: [
        { school: "NED University", degree: "BE", fieldOfStudy: "Software Engineering", years: "2017 – 2021" },
      ],
    },
  },
  {
    name: "Sara Malik",
    username: "sara.malik",
    email: "sara@example.com",
    profile: {
      currentPost: "Machine Learning Engineer — Computer Vision",
      location: "Islamabad, Pakistan",
      bio: "Training vision models for retail analytics. PyTorch, OpenCV and a lot of coffee.",
      skills: ["Python", "PyTorch", "Computer Vision", "OpenCV", "MLOps"],
      pastWork: [{ company: "VisionAI", position: "ML Engineer", years: "2021 – Present" }],
      education: [{ school: "NUST", degree: "MS", fieldOfStudy: "Artificial Intelligence", years: "2019 – 2021" }],
    },
  },
  {
    name: "Usman Tariq",
    username: "usman.tariq",
    email: "usman@example.com",
    profile: {
      currentPost: "Product Designer",
      location: "Remote",
      bio: "Designing simple products for complicated problems.",
      skills: ["Figma", "UX Research", "Design Systems"],
      pastWork: [{ company: "Freelance", position: "Product Designer", years: "2019 – Present" }],
      education: [],
    },
  },
];

const DEMO_POSTS = [
  { author: "ayesha.khan", body: "Just shipped a redesign of our dashboard — page load went from 3.1s to 1.2s after moving to static rendering and lazy-loading charts. Small wins add up! 🚀", likes: ["bilal.ahmed", "sara.malik"] },
  { author: "bilal.ahmed", body: "Reminder: always add indexes for the fields you sort and filter by. One compound index took our feed query from 900ms to 12ms.", likes: ["ayesha.khan"] },
  { author: "sara.malik", body: "We're hiring two ML interns in Islamabad this winter. If you love computer vision, send me a message!", likes: ["ayesha.khan", "usman.tariq", "bilal.ahmed"] },
  { author: "usman.tariq", body: "Good design is invisible. If users have to think about the interface, the interface is in the way.", likes: [] },
];

const DEMO_COMMENTS = [
  { post: 0, author: "bilal.ahmed", body: "Huge improvement, congrats!" },
  { post: 2, author: "ayesha.khan", body: "Sharing this with my students 🙌" },
  { post: 1, author: "sara.malik", body: "Learned this the hard way last year 😅" },
];

// Pairs that should be connected (accepted) and one pending request.
const CONNECTIONS = [
  ["ayesha.khan", "bilal.ahmed", true],
  ["sara.malik", "ayesha.khan", true],
  ["usman.tariq", "sara.malik", null],
];

const run = async () => {
  if (env.isProduction && !process.argv.includes("--force")) {
    throw new Error("Refusing to seed a production database. Pass --force if you really mean it.");
  }
  assertRequiredEnv();
  await connectDB(env.mongoUri);

  const hash = await bcrypt.hash(PASSWORD, 10);
  const byUsername = {};

  for (const demo of DEMO_USERS) {
    let user = await User.findOne({ username: demo.username });
    if (!user) {
      user = await User.create({ name: demo.name, username: demo.username, email: demo.email, password: hash });
      await Profile.create({ userId: user._id, ...demo.profile });
      console.log(`+ user ${demo.username}`);
    } else {
      console.log(`= user ${demo.username} already exists`);
    }
    byUsername[demo.username] = user;
  }

  for (const [from, to, accepted] of CONNECTIONS) {
    const a = byUsername[from]._id;
    const b = byUsername[to]._id;
    const exists = await ConnectionRequest.exists({
      $or: [
        { userId: a, connectionId: b },
        { userId: b, connectionId: a },
      ],
    });
    if (!exists) await ConnectionRequest.create({ userId: a, connectionId: b, status_accepted: accepted });
  }

  const alreadySeeded = await Post.exists({ userId: byUsername["ayesha.khan"]._id });
  if (!alreadySeeded) {
    const created = [];
    for (const [index, demo] of DEMO_POSTS.entries()) {
      const post = await Post.create({
        userId: byUsername[demo.author]._id,
        body: demo.body,
        likes: demo.likes.map((u) => byUsername[u]._id),
        // Spread the posts out over the last few hours.
        createdAt: new Date(Date.now() - (DEMO_POSTS.length - index) * 3 * 60 * 60 * 1000),
      });
      created.push(post);
    }
    for (const demo of DEMO_COMMENTS) {
      await Comment.create({
        postId: created[demo.post]._id,
        userId: byUsername[demo.author]._id,
        body: demo.body,
      });
    }
    console.log(`+ ${created.length} posts, ${DEMO_COMMENTS.length} comments`);
  }

  console.log(`\nDone. Log in with any demo email (e.g. ayesha@example.com) and password "${PASSWORD}".`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
