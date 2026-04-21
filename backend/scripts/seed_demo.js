const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Problem = require("../models/Problem");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sevalink";

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing
    await User.deleteMany({ email: { $ne: "admin@sevalink.com" } });
    await Problem.deleteMany({});

    console.log("Cleared old data...");

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash("password123", salt);

    // 1. Create Volunteers
    const volunteers = [];
    for (let i = 1; i <= 10; i++) {
      volunteers.push({
        name: `Volunteer ${i}`,
        email: `volunteer${i}@example.com`,
        password,
        role: "Volunteer",
        phone: `987654321${i}`,
        location: {
          lat: 19.076 + Math.random() * 0.1,
          lng: 72.877 + Math.random() * 0.1,
        },
        skills: ["First Aid", "Coordination", "Driving"].slice(0, Math.floor(Math.random() * 3) + 1),
      });
    }
    await User.insertMany(volunteers);
    console.log("Created 10 volunteers.");

    // 2. Create NGOs
    const ngos = [];
    for (let i = 1; i <= 5; i++) {
      ngos.push({
        name: `NGO Help ${i}`,
        email: `ngo${i}@example.com`,
        password,
        role: "NGO",
        ngoName: `Seva Foundation ${i}`,
        location: {
          lat: 19.076 + Math.random() * 0.1,
          lng: 72.877 + Math.random() * 0.1,
        },
      });
    }
    await User.insertMany(ngos);
    console.log("Created 5 NGOs.");

    // 3. Create Problems
    const categories = ["Water Leak", "Road Damage", "Waste", "Electricity", "Emergency"];
    const urgencies = ["Low", "Medium", "High", "Critical"];
    
    const problems = [];
    for (let i = 1; i <= 20; i++) {
      const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
      problems.push({
        title: `Civic Issue #${i}: ${categories[Math.floor(Math.random() * categories.length)]}`,
        description: `Detailed report for civic issue #${i}. This needs attention from the community and local authorities.`,
        category: categories[Math.floor(Math.random() * categories.length)],
        urgency,
        status: i % 5 === 0 ? "In Progress" : "Open",
        location: {
          lat: 19.076 + Math.random() * 0.1,
          lng: 72.877 + Math.random() * 0.1,
        },
        locationName: `Ward ${Math.floor(Math.random() * 10) + 1}, Metro City`,
        score: Math.floor(Math.random() * 100),
      });
    }
    await Problem.insertMany(problems);
    console.log("Created 20 problems.");

    console.log("✅ Seeding complete!");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seedData();
