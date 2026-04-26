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
      const result = await res.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || result.error || `API Error: ${res.status}`);
      }
      return result.data !== undefined ? result.data : result;
    }),
    
  post: (url, data) =>
    fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(async (res) => {
      const result = await res.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || result.error || `API Error: ${res.status}`);
      }
      return result.data !== undefined ? result.data : result;
    }),

  put: (url, data) =>
    fetch(`${BASE_URL}${url}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(async (res) => {
      const result = await res.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || result.error || `API Error: ${res.status}`);
      }
      return result.data !== undefined ? result.data : result;
    }),

  delete: (url) =>
    fetch(`${BASE_URL}${url}`, {
      method: "DELETE",
      headers: getHeaders(),
    }).then(async (res) => {
      const result = await res.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || result.error || `API Error: ${res.status}`);
      }
      return result.data !== undefined ? result.data : result;
    }),
};
