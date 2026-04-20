// Frontend-only auth using localStorage (hackathon safe — no backend changes)

export const login = (user) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("seva_user", JSON.stringify(user));
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("seva_user");
  }
};

export const getUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("seva_user"));
  } catch {
    return null;
  }
};

export const isLoggedIn = () => !!getUser();

export const getRoleLabel = (role) => {
  const map = {
    User: "👤 User",
    Volunteer: "🤝 Volunteer",
    NGO: "🏢 NGO",
    Worker: "🔧 NGO Worker",
  };
  return map[role] || "👤 User";
};
