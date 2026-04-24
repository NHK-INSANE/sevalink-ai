// constants
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

console.log("🌐 API DEBUG: Initialized BASE_URL =", BASE_URL);

// 🔒 Safe fetch wrapper
export async function apiRequest(endpoint, options = {}) {
  try {
    let token = null;
    if (typeof window !== "undefined") {
      token = localStorage.getItem("token");
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const text = await res.text();

    // ❌ If HTML comes → backend error
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error("Server error (HTML returned). Backend might be down.");
    }

    if (!text) {
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      return {};
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error. Raw text:", text);
      throw new Error("Invalid response from server.");
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || `API Error ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error("API ERROR:", err.message);
    if (err.message === "Failed to fetch") {
      throw new Error("Server not reachable. Please try again.");
    }
    throw err;
  }
}

// Get all problems
export const getProblems = async () => {
  try {
    return await apiRequest("/api/problems");
  } catch (err) {
    return []; // Return empty array to keep UI functional
  }
};

// Create problem
export const createProblem = async (data) => {
  return await apiRequest("/api/problems", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Get AI urgency
export const getUrgency = async (description) => {
  try {
    return await apiRequest("/api/ai/urgency", {
      method: "POST",
      body: JSON.stringify({ description }),
    });
  } catch (err) {
    return { urgency: "Low", score: 0 };
  }
};

// Update problem status
export const updateProblemStatus = async (id, status) => {
  return await apiRequest(`/api/problems/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

// Register new user
export const registerUser = async (data) => {
  return await apiRequest("/api/users/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Login user
export const loginUser = async (data) => {
  return await apiRequest("/api/users/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Get all users (filtered by role in components)
export const getUsers = async () => {
  try {
    return await apiRequest("/api/users");
  } catch (err) {
    return [];
  }
};

// Delete problem (Owner only)
export const deleteProblem = async (id, userId) => {
  return await apiRequest(`/api/problems/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ userId }),
  });
};

// AI Suggest description
export const getAISuggestion = async (text) => {
  return await apiRequest("/api/ai/suggest", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
};

// Get Global Stats
export const getStats = async () => {
  try {
    const data = await apiRequest("/api/stats");
    console.log("📊 API STATS RECEIVED:", data);
    return data;
  } catch (err) {
    console.error("📊 API STATS ERROR:", err);
    return { users: 0, problems: 0, citizens: 0, responders: 0, ngos: 0 };
  }
};
