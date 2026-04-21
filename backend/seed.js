const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Problem = require("./models/Problem");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://rohan99038:rohan2006@cluster0.xlyakhy.mongodb.net/?appName=Cluster0";

async function seed() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!");

    // Clear existing data (Optional - uncomment if you want a fresh start)
    // console.log("🧹 Clearing old data...");
    // await User.deleteMany({ email: { $ne: "siba@example.com" } }); 
    // await Problem.deleteMany({});

    const roles = ["Volunteer", "Worker", "NGO"];
    const categories = ["Food Supply", "Medical Aid", "Infrastructure", "Shelter", "Water Supply", "Rescue"];
    const urgencies = ["Critical", "High", "Medium", "Low"];
    const skills = ["Medical", "Logistics", "Engineering", "First Aid", "Driving", "Cooking"];

    console.log("👤 Generating 150 Users...");
    const users = [];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    for (let i = 1; i <= 150; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      users.push({
        name: `${role} User ${i}`,
        email: `${role.toLowerCase()}${i}@sevalink.com`,
        password: hashedPassword,
        role: role,
        location: {
          lat: 22.57 + (Math.random() - 0.5) * 4,
          lng: 88.36 + (Math.random() - 0.5) * 4,
        },
        skill: role !== "NGO" ? skills[Math.floor(Math.random() * skills.length)] : "",
        ngoName: role === "NGO" ? `Universal Relief NGO ${i}` : "",
        bio: `Professional ${role} dedicated to disaster response and community support.`,
        createdAt: new Date(Date.now() - Math.random() * 1000000000),
      });
    }
    await User.insertMany(users);
    console.log("✅ 150 Users created!");

    console.log("⚠️ Generating 120 Problems...");
    const problems = [];
    const createdUsers = await User.find({ role: "Volunteer" }).limit(50);

    for (let i = 1; i <= 120; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
      const creator = createdUsers[Math.floor(Math.random() * createdUsers.length)];

      problems.push({
        title: `${category} Emergency in Zone ${i}`,
        description: `Urgent requirement for ${category.toLowerCase()} due to recent events. High priority for local residents in this district.`,
        category: category,
        location: {
          lat: 22.57 + (Math.random() - 0.5) * 5,
          lng: 88.36 + (Math.random() - 0.5) * 5,
          address: `${Math.floor(Math.random() * 500)} Main St, Disaster Zone ${i}`,
        },
        createdBy: creator._id.toString(),
        urgency: urgency,
        score: Math.floor(Math.random() * 100),
        requiredSkill: skills[Math.floor(Math.random() * skills.length)],
        status: Math.random() > 0.7 ? "In Progress" : "Open",
        createdAt: new Date(Date.now() - Math.random() * 500000000),
      });
    }
    await Problem.insertMany(problems);
    console.log("✅ 120 Problems created!");

    console.log("\n🚀 DATABASE SEEDED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
