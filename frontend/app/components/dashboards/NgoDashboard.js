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
  const openProblems = safeProbs.filter(p => p?.status === "Open");
  const inProgress = safeProbs.filter(p => p?.status === "In Progress");

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">Unassigned Cases</p>
          <p className="text-2xl font-bold text-red-400"><Counter value={openProblems.length} /></p>
        </div>
        <div className="card">
          <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">Active Missions</p>
          <p className="text-2xl font-bold text-indigo-400"><Counter value={inProgress.length} /></p>
        </div>
        <div className="card">
          <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">Pending Requests</p>
          <p className="text-2xl font-bold text-purple-400"><Counter value={requests.length} /></p>
        </div>
      </div>

      {/* Mission Requests */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Incoming Mission Requests</h3>
        </div>
        <div className="p-6">
          {requests.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">No pending deployments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.07] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${req.type === 'lead' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {req.type === 'lead' ? 'LD' : 'JN'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{req.userId?.name}</span>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">[{req.userId?.customId}]</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Wants to {req.type === 'lead' ? 'lead' : 'join'} mission: <span className="text-indigo-400">{req.problemId?.title}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRequestAction(req._id, "approved")}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20 transition-all"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRequestAction(req._id, "rejected")}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-500/20 transition-all"
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
