"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import Counter from "../components/Counter";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-xl" />
});

import AdminDashboard from "../components/dashboards/AdminDashboard";
import NgoDashboard from "../components/dashboards/NgoDashboard";
import VolunteerDashboard from "../components/dashboards/VolunteerDashboard";

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  const fetchProblems = async () => {
    try {
      const data = await getProblems();
      setProblems(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      setError("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProblems();
    fetchUsers();
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location access denied")
      );
    }

    const socket = io(API_BASE);
    socket.on("new-problem", (newProb) => {
      setProblems(prev => [newProb, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17]">
        <Navbar />
        <main className="page-wrapper pt-[120px]">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-white/5 rounded-2xl w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
            </div>
            <div className="h-[400px] bg-white/5 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  const renderDashboard = () => {
    const role = user?.role?.toLowerCase();
    if (role === "admin") return <AdminDashboard problems={problems} usersList={usersList} lastUpdate={lastUpdate} />;
    if (role === "ngo") return <NgoDashboard problems={problems} usersList={usersList} />;
    return <VolunteerDashboard problems={problems} userLoc={userLoc} />;
  };

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      <Navbar />
      <PageWrapper>
        <main className="page-wrapper pt-[120px] pb-20">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Welcome back, {user?.name?.split(" ")[0] || "Agent"}
              </h1>
              <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Operational Status: <span className="text-gray-300">Active</span>
                <span className="mx-2 opacity-20">|</span>
                Role: <span className="text-indigo-400 uppercase text-[10px] font-bold tracking-widest">{user?.role || "Volunteer"}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <Link href="/submit" className="btn-primary">Report Crisis</Link>
            </div>
          </header>

          {renderDashboard()}
        </main>
      </PageWrapper>
    </div>
  );
}

