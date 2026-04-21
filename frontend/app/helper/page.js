"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";

export default function Helper() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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

  const filteredHelpers = helpers.filter((h) => {
    if (filter === "all") return true;
    return h.role?.toLowerCase() === filter;
  });

  const FILTERS = [
    { id: "all", label: "All", icon: "🌐" },
    { id: "volunteer", label: "Volunteers", icon: "🤝" },
    { id: "worker", label: "Workers", icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />
      <PageWrapper>

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🤝 Helpers &amp; Volunteers</h1>
          <p className="text-gray-500">
            Dedicated individuals and workers from our community.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition duration-200 text-xs font-semibold ${
                filter === f.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-blue-600 hover:bg-gray-50"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl h-56 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : (
          <>
            {filteredHelpers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-md border border-dashed border-gray-200">
                <div className="text-5xl mb-4">🤝</div>
                <p className="text-gray-400 font-medium">
                  {filter === "all" ? "No helpers registered yet." : `No ${filter}s registered yet.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHelpers.map((h) => (
                  <div
                    key={h._id || h.id}
                    className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 card-hover"
                  >
                    {/* Avatar + Name + Role */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                        {h.role?.toLowerCase() === "volunteer" ? "🤝" : "🔧"}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-800 leading-tight">{h.name}</h2>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          h.role?.toLowerCase() === "volunteer" ? "text-blue-600" : "text-orange-600"
                        }`}>
                          {h.role}
                        </span>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-2 text-sm mb-4">
                      {h.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📧</span>
                          <span className="truncate">{h.email}</span>
                        </div>
                      )}
                      {h.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📞</span>
                          <span>{h.phone}</span>
                        </div>
                      )}
                      {h.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📍</span>
                          <span className="line-clamp-1">{h.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {(h.skills?.length > 0 || h.skill) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(h.skills?.length > 0
                          ? h.skills
                          : [h.skill]
                        ).map((s, i) => (
                          <span
                            key={i}
                            className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* NGO for workers */}
                    {h.role?.toLowerCase() === "worker" && h.ngoName && (
                      <p className="text-xs text-gray-500 mb-3">
                        🏢 NGO: <span className="font-semibold text-gray-700">{h.ngoName}</span>
                      </p>
                    )}

                    <hr className="border-gray-100 mb-3" />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        Available
                      </span>
                      <button className="ripple px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 hover:scale-105 active:scale-95 transition duration-200">
                        Contact
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      </PageWrapper>
    </div>
  );
}
