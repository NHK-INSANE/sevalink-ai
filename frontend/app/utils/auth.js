// Frontend-only auth using localStorage (hackathon safe — no backend changes)

export const login = (user) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("seva_user", JSON.stringify(user));
    localStorage.setItem("token", JSON.stringify(user)); // Mock token
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
    User: "👤 User",
    Volunteer: "🤝 Volunteer",
    NGO: "🏢 NGO",
    Worker: "🔧 NGO Worker",
  };
  return map[role] || "👤 User";
};
