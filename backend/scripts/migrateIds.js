const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Problem = require("../models/Problem");

const generateHexId = (prefix) => {
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, "0");
  return `${prefix}-${hex}`;
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const users = await User.find({ customId: { $exists: false } });
    console.log(`Migrating ${users.length} users...`);
    for (const user of users) {
      user.customId = generateHexId("USER");
      await user.save();
    }

    const problems = await Problem.find({ problemId: { $exists: false } });
    console.log(`Migrating ${problems.length} problems...`);
    for (const prob of problems) {
      prob.problemId = generateHexId("PRB");
      await prob.save();
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrate();
