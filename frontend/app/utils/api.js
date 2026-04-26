import { api } from "../../lib/api";

// 🔒 Legacy wrapper for existing imports
export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || "GET").toLowerCase();
  const body = options.body ? JSON.parse(options.body) : null;
  
  try {
    if (method === "get") return await api.get(endpoint);
    if (method === "post") return await api.post(endpoint, body);
    if (method === "put") return await api.put(endpoint, body);
    if (method === "patch") {
       // lib/api doesn't have patch, we'll use a fetch directly or extend it
       const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";
       const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
       const res = await fetch(`${BASE_URL}${endpoint}`, {
         method: "PATCH",
         headers: { 
           "Content-Type": "application/json",
           ...(token ? { Authorization: `Bearer ${encodeURIComponent(token)}` } : {})
         },
         body: options.body
       });
       return await res.json();
    }
    if (method === "delete") return await api.delete(endpoint);
  } catch (err) {
    console.error(`apiRequest error (${endpoint}):`, err);
    throw err;
  }
}

export const getProblems = () => api.get("/api/problems").catch(() => []);
export const getUsers = () => api.get("/api/users").catch(() => []);
export const getStats = () => api.get("/api/stats").catch(() => ({ users: 0, problems: 0, citizens: 0, responders: 0, ngos: 0 }));

export const createProblem = (data) => api.post("/api/problems", data);
export const registerUser = (data) => api.post("/api/users/register", data);
export const loginUser = (data) => api.post("/api/users/login", data);

export const updateProblemStatus = (id, status) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return fetch(`${BASE_URL}/api/problems/${id}/status`, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${encodeURIComponent(token)}` } : {})
    },
    body: JSON.stringify({ status })
  }).then(res => res.json());
};

export const deleteProblem = (id, userId) => api.delete(`/api/problems/${id}`);

export const getUrgency = (description) => api.post("/api/ai/urgency", { description }).catch(() => ({ urgency: "Low", score: 0 }));
export const getAISuggestion = (text) => api.post("/api/ai/suggest", { text });
