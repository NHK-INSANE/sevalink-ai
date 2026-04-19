const BASE_URL = "https://sevalink-backend-bmre.onrender.com";

// Get all problems
export const getProblems = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/problems`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching problems:", err);
    return [];
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
    return await res.json();
  } catch (err) {
    console.error("Error creating problem:", err);
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
    return await res.json();
  } catch (err) {
    console.error("AI error:", err);
    return { urgency: "Low" };
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
    return await res.json();
  } catch (err) {
    console.error("Error updating status:", err);
  }
};
