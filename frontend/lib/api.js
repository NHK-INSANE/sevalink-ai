const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${encodeURIComponent(token)}` } : {}),
  };
};

export const api = {
  get: (url) => 
    fetch(`${BASE_URL}${url}`, {
      headers: getHeaders(),
    }).then(async (res) => {
      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch { err = {}; }
        throw new Error(err.error || err.message || `API Error: ${res.status}`);
      }
      return res.json();
    }),
    
  post: (url, data) =>
    fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch { err = {}; }
        throw new Error(err.error || err.message || `API Error: ${res.status}`);
      }
      return res.json();
    }),

  put: (url, data) =>
    fetch(`${BASE_URL}${url}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch { err = {}; }
        throw new Error(err.error || err.message || `API Error: ${res.status}`);
      }
      return res.json();
    }),

  delete: (url) =>
    fetch(`${BASE_URL}${url}`, {
      method: "DELETE",
      headers: getHeaders(),
    }).then(async (res) => {
      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch { err = {}; }
        throw new Error(err.error || err.message || `API Error: ${res.status}`);
      }
      return res.json();
    }),
};
