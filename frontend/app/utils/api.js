// constants
const RENDER_BACKEND = "https://sevalink-backend-bmre.onrender.com";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || RENDER_BACKEND;

console.log("🌐 API DEBUG: Initialized BASE_URL =", BASE_URL);

// Helper for verbose fetching
const verboseFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`🚀 API CALL: ${options.method || 'GET'} ${url}`);
  
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    
    // Log the first 100 chars of response for debugging
    console.log(`📥 API RESPONSE [${res.status}]:`, text.substring(0, 100) + (text.length > 100 ? "..." : ""));

    if (!res.ok) {
      console.error(`❌ API ERROR: ${res.status} URL: ${url}`, text);
      // Attempt to parse as JSON if it failed, but keep the raw text available
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch (e) {
        errorData = { error: text };
      }
      throw new Error(errorData.error || errorData.message || `Server returned ${res.status}`);
    }

    // Try parsing as JSON for successful responses
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("❌ JSON PARSE ERROR:", text);
      throw new Error("Invalid JSON response from server");
    }
  } catch (err) {
    console.error("🔥 FETCH EXCEPTION:", err.message);
    throw err;
  }
};

// Get all problems
export const getProblems = async () => {
  try {
    return await verboseFetch("/api/problems", {
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    return []; // Return empty array to keep UI functional
  }
};

// Create problem
export const createProblem = async (data) => {
  return await verboseFetch("/api/problems", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// Get AI urgency
export const getUrgency = async (description) => {
  try {
    return await verboseFetch("/api/ai/urgency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  } catch (err) {
    return { urgency: "Low", score: 0 };
  }
};

// Update problem status
export const updateProblemStatus = async (id, status) => {
  return await verboseFetch(`/api/problems/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
};

// Register new user
export const registerUser = async (data) => {
  console.log("📝 DATA BEING SENT TO REGISTER:", JSON.stringify(data, null, 2));
  return await verboseFetch("/api/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// Login user
export const loginUser = async (data) => {
  return await verboseFetch("/api/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// Get all users (filtered by role in components)
export const getUsers = async () => {
  try {
    return await verboseFetch("/api/users");
  } catch (err) {
    return [];
  }
};

// Delete problem
export const deleteProblem = async (id) => {
  return await verboseFetch(`/api/problems/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
};

// AI Suggest description
export const getAISuggestion = async (text) => {
  return await verboseFetch("/api/ai/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
};
