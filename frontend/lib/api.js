const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export const api = {
  get: (url) => 
    fetch(`${BASE_URL}${url}`).then(async (res) => {
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    }),
    
  post: (url, data) =>
    fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    }),

  put: (url, data) =>
    fetch(`${BASE_URL}${url}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    }),

  delete: (url) =>
    fetch(`${BASE_URL}${url}`, {
      method: "DELETE",
    }).then(async (res) => {
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    }),
};
