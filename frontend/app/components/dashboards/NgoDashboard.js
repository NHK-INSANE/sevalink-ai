"use client";
import { motion } from "framer-motion";
import Counter from "../Counter";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import ProblemCard from "../ProblemCard";
import Link from "next/link";



export default function NgoDashboard({ problems = [], usersList = [] }) {
  const [requests, setRequests] = useState([]);
  const safeProbs = Array.isArray(problems) ? problems : [];
  const openProblems = safeProbs.filter(p => String(p?.status || "").toLowerCase() === "open");
  const inProgress = safeProbs.filter(p => {
    const s = String(p?.status || "").toLowerCase();
    return s === "in_progress" || s === "in progress" || s === "in-progress";
  });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/requests/ngo`, {
          headers: { "Authorization": `Bearer ${encodeURIComponent(token)}` }
        });
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
    };
    fetchRequests();
  }, []);

  const handleRequestAction = async (requestId, status) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${encodeURIComponent(token)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Request ${status}`);
        setRequests(prev => prev.filter(r => r._id !== requestId));
      }
    } catch (err) { toast.error("Action failed"); }
  };

  return (
    <div className="space-y-8">
      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "Unassigned Cases", value: openProblems.length, color: "text-red-500" },
          { label: "Active Missions", value: inProgress.length, color: "text-blue-500" },
          { label: "Pending Requests", value: requests.length, color: "text-purple-500" }
        ].map((stat) => (
          <div key={stat.label} className="card p-6 !rounded-2xl">
            <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color} tracking-tight`}>
              <Counter value={stat.value} />
            </p>
          </div>
        ))}
      </div>

      {/* MISSION REQUESTS */}
      <div className="card overflow-hidden">
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">Personnel Deployments</h3>
        </div>
        <div className="p-8">
          {requests.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">No pending deployments found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-purple-500/20 transition-all gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs ${req.type === 'lead' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {req.type === 'lead' ? 'LD' : 'JN'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{req.userId?.name}</span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">[{req.userId?.customId || "NEW"}]</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        Deployment to <span className="text-purple-400 font-bold">{req.problemId?.title}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRequestAction(req._id, "approved")}
                      className="btn-secondary !bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20 !py-2 !px-5 !text-[11px]"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRequestAction(req._id, "rejected")}
                      className="btn-secondary !bg-red-500/10 !text-red-500 !border-red-500/20 !py-2 !px-5 !text-[11px]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
