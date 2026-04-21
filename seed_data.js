// Using built-in fetch (Node 18+)

const API = "https://sevalink-backend-bmre.onrender.com";

async function seed() {
  console.log("🌱 Seeding data to:", API);

  // 1. Create Users (NGOs, Volunteers, Workers)
  for (let i = 1; i <= 25; i++) {
    const role = ["Volunteer", "Worker", "NGO"][i % 3];
    try {
      await fetch(`${API}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${role} ${i}`,
          email: `${role.toLowerCase()}${i}@example.com`,
          password: "password123",
          role: role,
          location: {
            lat: 22.57 + (Math.random() - 0.5) * 5,
            lng: 88.36 + (Math.random() - 0.5) * 5,
          },
          ngoName: role === "NGO" ? `Global NGO ${i}` : "",
          skill: role !== "NGO" ? ["Medical", "Logistics", "Engineering"][i % 3] : "",
        }),
      });
      process.stdout.write(".");
    } catch (e) {
      console.error("\n❌ Error creating user:", e.message);
    }
  }

  // 2. Create Problems
  for (let i = 1; i <= 25; i++) {
    const urgency = ["Critical", "High", "Medium", "Low"][i % 4];
    const category = ["Food Supply", "Medical Aid", "Infrastructure", "Shelter"][i % 4];
    try {
      await fetch(`${API}/api/problems`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${JSON.stringify({ id: "seed_user_" + i, role: "User" })}` // Mock auth for creating
        },
        body: JSON.stringify({
          title: `Report #${i}: Emergency ${category}`,
          description: `Automatically generated test report for ${category} with ${urgency} priority in the local district.`,
          category: category,
          urgency: urgency,
          requiredSkill: ["Medical Aid", "Logistics", "Engineering"][i % 3],
          location: {
            lat: 22.57 + (Math.random() - 0.5) * 4,
            lng: 88.36 + (Math.random() - 0.5) * 4,
            address: `Block ${i}, Test District`
          },
          score: Math.floor(Math.random() * 100),
          status: "Open"
        }),
      });
      process.stdout.write("!");
    } catch (e) {
      console.error("\n❌ Error creating problem:", e.message);
    }
  }

  console.log("\n✅ Data seeding completed!");
}

seed();
