"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getUsers } from "../utils/api";

export default function Helper() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const filtered = data.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );
        setHelpers(filtered);
      })
      .catch((err) => console.error("Fetch helpers error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🤝 Helpers & Volunteers</h1>
          <p className="text-gray-500">
            Dedicated individuals and workers from our community.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl h-48 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : (
          <>
            {helpers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-md border border-dashed border-gray-200">
                <div className="text-5xl mb-4">🤝</div>
                <p className="text-gray-400 font-medium">No helpers registered yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {helpers.map((h) => (
                  <div
                    key={h._id || h.id}
                    className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-200"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
                        {h.role?.toLowerCase() === "volunteer" ? "🤝" : "🔧"}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-800">{h.name}</h2>
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{h.role}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-400">🛠 Skill:</span>
                        <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
                          {h.skill || h.skills?.join(", ") || "General"}
                        </span>
                      </div>

                      {h.ngoName && (
                        <div className="text-xs text-gray-500">
                          🏢 Under: {h.ngoName}
                        </div>
                      )}

                      {h.address && (
                        <div className="text-xs text-gray-500">
                          📍 {h.address}
                        </div>
                      )}

                      <hr className="border-gray-100" />

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          Available
                        </span>
                        <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition duration-200">
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
