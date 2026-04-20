const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  console.error("⚠️ API URL NOT FOUND! Please check your .env.local file.");
}


// Get all problems
export const getProblems = async () => {
  try {
    const res = await fetch(`${BASE_URL}/problems`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Problem API Raw Error:", text);
      throw new Error("Backend server error");
    }
    return await res.json();
  } catch (err) {
    console.error("❌ Problem API Error:", err.message);
    return []; // Return empty array to keep UI functional
  }
};

// Create problem
export const createProblem = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/problems`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Create Problem Raw Error:", text);
      throw new Error("Failed to create problem");
    }
    return await res.json();
  } catch (err) {
    console.error("Error creating problem:", err);
    throw err;
  }
};

// Get AI urgency
export const getUrgency = async (description) => {
  try {
    const res = await fetch(`${BASE_URL}/ai/urgency`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("❌ AI Urgency Raw Error:", text);
      throw new Error("AI analysis failed");
    }
    return await res.json();
  } catch (err) {
    console.error("AI error:", err);
    return { urgency: "Low", score: 0 };
  }
};

// Update problem status
export const updateProblemStatus = async (id, status) => {
  try {
    const res = await fetch(`${BASE_URL}/problems/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Update Status Raw Error:", text);
      throw new Error("Failed to update status");
    }
    return await res.json();
  } catch (err) {
    console.error("Error updating status:", err);
    throw err;
  }
};

// Register new user
export const registerUser = async (data) => {
  const res = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  const text = await res.text();
  console.log("📝 REGISTER RAW RESPONSE:", text);

  try {
    const json = JSON.parse(text);
    if (!res.ok) throw new Error(json.error || "Registration failed");
    return json;
  } catch (err) {
    if (!res.ok) throw new Error(`Registration failed: ${text.substring(0, 50)}...`);
    throw err;
  }
};

// Login user
export const loginUser = async (data) => {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const text = await res.text();
  console.log("🔑 LOGIN RAW RESPONSE:", text);

  try {
    const json = JSON.parse(text);
    if (!res.ok) throw new Error(json.error || "Login failed");
    return json;
  } catch (err) {
    if (!res.ok) throw new Error(`Login failed: ${text.substring(0, 50)}...`);
    throw err;
  }
};
