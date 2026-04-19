const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const getProblems = async () => {
  const res = await fetch(`${BASE_URL}/api/problems`);
  if (!res.ok) throw new Error("Failed to fetch problems");
  return res.json();
};

export const createProblem = async (data) => {
  const res = await fetch(`${BASE_URL}/api/problems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create problem");
  return res.json();
};

export const getUrgency = async (description) => {
  const res = await fetch(`${BASE_URL}/api/ai/urgency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) return { urgency: "Medium" };
  return res.json();
};

export const updateProblemStatus = async (id, status) => {
  const res = await fetch(`${BASE_URL}/api/problems/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
};
