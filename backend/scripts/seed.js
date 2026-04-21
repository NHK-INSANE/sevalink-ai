const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Problem = require("../models/Problem");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sevalink";

const skillsList = [
  "Medical Aid", "Food Supply", "Logistics",
  "Engineering", "Rescue", "Education",
  "IT Support", "Social Work", "Legal Aid"
];

const categories = ["Medical", "Disaster", "Education", "Infrastructure", "Waste", "Water"];

const cityCoords = {
  "Kolkata":   { lat: 22.5726, lng: 88.3639 },
  "Delhi":     { lat: 28.6139, lng: 77.2090 },
  "Mumbai":    { lat: 19.0760, lng: 72.8777 },
  "Chennai":   { lat: 13.0827, lng: 80.2707 },
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Pune":      { lat: 18.5204, lng: 73.8567 },
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Jaipur":    { lat: 26.9124, lng: 75.7873 },
  "Lucknow":   { lat: 26.8467, lng: 80.9462 }
};

const cities = Object.keys(cityCoords);

function getRandomLocation(cityName) {
  const base = cityCoords[cityName];
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.1,
    lng: base.lng + (Math.random() - 0.5) * 0.1
  };
}

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");

    // Clear existing (except admin if any)
    await User.deleteMany({ email: { $ne: "admin@sevalink.com" } });
    await Problem.deleteMany({});
    console.log("Cleared database.");

    const password = await bcrypt.hash("123456", 10);

    // 🔹 Generate NGOs
    console.log("Generating NGOs...");
    const ngosData = Array.from({ length: 30 }).map(() => {
      const city = faker.helpers.arrayElement(cities);
      return {
        role: "NGO",
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, '').slice(0, 10),
        address: faker.location.streetAddress() + ", " + city,
        ngoName: faker.company.name(),
        bio: faker.company.catchPhrase(),
        password,
        location: getRandomLocation(city)
      };
    });
    const createdNgos = await User.insertMany(ngosData);

    // 🔹 Users
    console.log("Generating Users...");
    const usersData = Array.from({ length: 20 }).map(() => {
      const city = faker.helpers.arrayElement(cities);
      return {
        role: "User",
        name: faker.person.fullName(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, '').slice(0, 10),
        address: faker.location.streetAddress() + ", " + city,
        password,
        location: getRandomLocation(city)
      };
    });
    await User.insertMany(usersData);

    // 🔹 Volunteers
    console.log("Generating Volunteers...");
    const volunteersData = Array.from({ length: 50 }).map(() => {
      const city = faker.helpers.arrayElement(cities);
      return {
        role: "Volunteer",
        name: faker.person.fullName(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, '').slice(0, 10),
        address: faker.location.streetAddress() + ", " + city,
        password,
        skills: faker.helpers.arrayElements(skillsList, { min: 2, max: 4 }),
        location: getRandomLocation(city)
      };
    });
    await User.insertMany(volunteersData);

    // 🔹 Workers
    console.log("Generating Workers...");
    const workersData = Array.from({ length: 50 }).map(() => {
      const city = faker.helpers.arrayElement(cities);
      const ngo = faker.helpers.arrayElement(createdNgos);
      return {
        role: "Worker",
        name: faker.person.fullName(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, '').slice(0, 10),
        address: faker.location.streetAddress() + ", " + city,
        password,
        ngoName: ngo.name,
        skills: faker.helpers.arrayElements(skillsList, { min: 2, max: 3 }),
        location: getRandomLocation(city)
      };
    });
    await User.insertMany(workersData);

    // 🔹 Problems
    console.log("Generating Problems...");
    const problemLevels = [
      { level: "Critical", count: 15 },
      { level: "High", count: 25 },
      { level: "Medium", count: 40 },
      { level: "Low", count: 45 }
    ];

    const problemsData = [];
    problemLevels.forEach(({ level, count }) => {
      for (let i = 0; i < count; i++) {
        const city = faker.helpers.arrayElement(cities);
        problemsData.push({
          title: `${level} Issue: ${faker.lorem.words(3)}`,
          description: faker.lorem.sentences(2),
          category: faker.helpers.arrayElement(categories),
          urgency: level,
          requiredSkill: faker.helpers.arrayElement(skillsList),
          locationName: faker.location.streetAddress() + ", " + city,
          location: getRandomLocation(city),
          status: faker.helpers.arrayElement(["Open", "In Progress", "Resolved"]),
          score: faker.number.int({ min: 10, max: 100 })
        });
      }
    });
    await Problem.insertMany(problemsData);

    console.log("✅ SEEDING COMPLETE!");
    console.log(`Inserted: 30 NGOs, 20 Users, 50 Volunteers, 50 Workers, ${problemsData.length} Problems.`);
    process.exit();
  } catch (err) {
    console.error("❌ SEEDING FAILED:", err);
    process.exit(1);
  }
};

seed();
