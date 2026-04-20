"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL;

export default function MapPage() {
  const [problems, setProblems] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [type, setType] = useState("problems");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/problems`)
      .then((r) => r.json())
      .then(setProblems)
      .catch(() => {});

    fetch(`${API}/api/users`)
      .then((r) => r.json())
      .then((data) => {
        setHelpers(
          data.filter(
            (u) =>
              u.role?.toLowerCase() === "volunteer" ||
              u.role?.toLowerCase() === "worker"
          )
        );
        setNgos(data.filter((u) => u.role?.toLowerCase() === "ngo"));
      })
      .catch(() => {});
  }, []);

  const filteredProblems =
    filter === "All"
      ? problems
      : problems.filter((p) => p.urgency === filter);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation([pos.coords.latitude, pos.coords.longitude]);
    });
  };

  const btnClass = (active) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      active
        ? "bg-blue-600 text-white"
        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
    }`;

  const filterClass = (active) =>
    `px-3 py-1 rounded-lg text-xs font-medium transition ${
      active
        ? "bg-blue-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
    }`;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <div className="pt-20 p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Crisis Map
        </h1>

        {/* Map type buttons */}
        <div className="flex gap-2 flex-wrap">
          {["all", "problems", "ngo", "helpers"].map((t) => (
            <button key={t} onClick={() => setType(t)} className={btnClass(type === t)}>
              {t === "all" ? "All" : t === "problems" ? "Problems" : t === "ngo" ? "NGOs" : "Helpers"}
            </button>
          ))}
          <button onClick={handleLocateMe} className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white">
            📍 Locate Me
          </button>
        </div>

        {/* Urgency filters (only for problems/all) */}
        {(type === "problems" || type === "all") && (
          <div className="flex gap-2 flex-wrap">
            {["All", "Critical", "High", "Medium", "Low"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={filterClass(filter === f)}>
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <div style={{ height: "500px" }}>
            <MapView
              type={type}
              problems={filteredProblems}
              ngos={ngos}
              helpers={helpers}
              userLocation={userLocation}
              onSelect={setSelected}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex gap-4 flex-wrap text-sm">
          <span className="flex items-center gap-2"><span style={{background:"#ef4444",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Critical</span>
          <span className="flex items-center gap-2"><span style={{background:"#f97316",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>High</span>
          <span className="flex items-center gap-2"><span style={{background:"#eab308",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Medium</span>
          <span className="flex items-center gap-2"><span style={{background:"#22c55e",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Low</span>
          <span className="flex items-center gap-2"><span style={{background:"#10b981",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>NGO</span>
          <span className="flex items-center gap-2"><span style={{background:"#3b82f6",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Helper</span>
          <span className="flex items-center gap-2"><span style={{background:"#8b5cf6",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>You</span>
        </div>

        {/* Selected problem detail */}
        {selected && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex justify-between">
              <h2 className="font-bold text-lg">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-red-400 text-sm">✕ Close</button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{selected.description}</p>
            <p className="mt-2 text-sm">Urgency: <b>{selected.urgency}</b> | Category: {selected.category}</p>
            <button
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.location?.lat},${selected.location?.lng}`)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Get Directions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
