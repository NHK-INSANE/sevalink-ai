// Frontend-only auth using localStorage (hackathon safe — no backend changes)

export const login = (data) => {
  if (typeof window !== "undefined") {
    // data should be { user, token }
    const userData = data.user || data; 
    const token = data.token || "";

    localStorage.setItem("seva_user", JSON.stringify(userData));
    if (token) {
      localStorage.setItem("token", token);
    }
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("seva_user");
    localStorage.removeItem("token");
  }
};

export const getUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const user = JSON.parse(localStorage.getItem("seva_user"));
    if (user) {
      user.id = user._id || user.id; // Normalize ID
      console.log("Auth Debug: User ID normalized to", user.id);
    }
    console.log("Auth Debug: getUser called, returning", user);
    return user;
  } catch {
    return null;
  }
};

export const isLoggedIn = () => !!getUser();

export const getRoleLabel = (role) => {
  const map = {
    user: "👤 User",
    volunteer: "🤝 Volunteer",
    ngo: "🏢 NGO",
    worker: "🔧 NGO Worker",
    admin: "⚡ Admin",
    // Keep uppercase for backward compatibility if needed during migration
    User: "👤 User",
    Volunteer: "🤝 Volunteer",
    NGO: "🏢 NGO",
    Worker: "🔧 NGO Worker",
  };
  return map[role] || "👤 User";
};
