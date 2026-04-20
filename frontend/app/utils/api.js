const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Get all problems
export const getProblems = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/problems`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    if (!res.ok) throw new Error("Backend server error");
    return await res.json();
  } catch (err) {
    console.error("❌ Problem API Error:", err.message);
    return []; // Return empty array to keep UI functional
  }
};

// Create problem
export const createProblem = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/api/problems`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create problem");
    return await res.json();
  } catch (err) {
    console.error("Error creating problem:", err);
    throw err;
  }
};

// Get AI urgency
export const getUrgency = async (description) => {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/urgency`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description }),
    });
    if (!res.ok) throw new Error("AI analysis failed");
    return await res.json();
  } catch (err) {
    console.error("AI error:", err);
    return { urgency: "Low", score: 0 };
  }
};

// Update problem status
export const updateProblemStatus = async (id, status) => {
  try {
    const res = await fetch(`${BASE_URL}/api/problems/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return await res.json();
  } catch (err) {
    console.error("Error updating status:", err);
    throw err;
  }
};

// Register new user
export const registerUser = async (data) => {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Registration failed");
  return json;
};

// Login user
export const loginUser = async (data) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Login failed");
  return json;
};
