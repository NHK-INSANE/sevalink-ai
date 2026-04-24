import AdminDashboard from "../components/dashboards/AdminDashboard";
import NgoDashboard from "../components/dashboards/NgoDashboard";
import VolunteerDashboard from "../components/dashboards/VolunteerDashboard";

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortNearest, setSortNearest] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [counts, setCounts] = useState({ total: 0, volunteers: 0, workers: 0, ngos: 0 });
  const prevCriticalRef = useRef(0);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const fetchProblems = async () => {
    try {
      setError(null);
      const data = await getProblems();
      const newCritical = data.filter((p) => p.urgency === "Critical").length;
      if (prevCriticalRef.current > 0 && newCritical > prevCriticalRef.current) {
        toast("🚨 New critical issue reported!", {
          icon: "⚠️",
          style: { background: "#1e1e2e", color: "#f87171", border: "1px solid #ef444440" },
          duration: 5000,
        });
      }
      prevCriticalRef.current = newCritical;
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
    
    // 🌐 Socket.IO Real-time Logic
    const socket = io(API_BASE);
    
    socket.on("connect", () => console.log("Connected to SevaLink Real-time Engine ⚡"));
    
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
      setLastUpdate(new Date().toLocaleTimeString());
    });

    socket.on("emergency-alert", (prob) => {
      toast.error(`🚨 EMERGENCY: ${prob.title}`, {
        duration: 8000,
        position: "top-center",
        style: {
          background: "#ef4444",
          color: "#fff",
          fontWeight: "bold",
          border: "2px solid #fff"
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  const openCount = problems.filter(p => p.status?.toLowerCase() === "open").length;
  const resolvedCount = problems.filter(p => p.status?.toLowerCase() === "resolved").length;
  const progressCount = problems.filter(p => p.status?.toLowerCase() === "in progress" || p.status?.toLowerCase() === "in-progress").length;

  const volunteersCount = usersList.filter(u => u.role?.toLowerCase() === "volunteer").length;
  const workersCount = usersList.filter(u => u.role?.toLowerCase() === "worker").length;
  const ngosCount = usersList.filter(u => u.role?.toLowerCase() === "ngo").length;

  const criticalCount = problems.filter(p => p.urgency?.toLowerCase() === "critical").length;
  const highCount = problems.filter(p => p.urgency?.toLowerCase() === "high").length;
  const mediumCount = problems.filter(p => p.urgency?.toLowerCase() === "medium").length;
  const lowCount = problems.filter(p => p.urgency?.toLowerCase() === "low").length;

  const categoryCount = {};
  problems.forEach(p => {
    const cat = p.category || "Other";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const totalProblems = problems.length || 1;
  const categoryData = Object.keys(categoryCount).map(cat => ({
    name: cat,
    value: categoryCount[cat],
    percent: ((categoryCount[cat] / totalProblems) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value);

  // 🔢 Live Counter Animation Logic
  useEffect(() => {
    const target = {
      total: problems.length,
      volunteers: volunteersCount,
      workers: workersCount,
      ngos: ngosCount
    };
    
    const interval = setInterval(() => {
      setCounts(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(target).forEach(k => {
          if (prev[k] < target[k]) {
            next[k] = Math.min(prev[k] + Math.ceil(target[k] / 20), target[k]);
            changed = true;
          } else if (prev[k] > target[k]) {
            next[k] = target[k];
            changed = true;
          }
        });
        if (!changed) clearInterval(interval);
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [problems.length, volunteersCount, workersCount, ngosCount]);

  const handleLocateAndSort = async () => {
    if (sortNearest) {
      setSortNearest(false);
      return;
    }
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortNearest(true);
      toast.success("Sorting by distance");
    } catch (err) {
      toast.error("Location permission required");
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * dLon / 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const sortedProblems = sortNearest && userLoc
    ? [...problems].sort((a, b) => {
        const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
        const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
        return d1 - d2;
      })
    : problems;

  const renderRoleSpecific = () => {
    const role = user?.role?.toLowerCase();
    if (role === "admin") return <AdminDashboard problems={problems} usersList={usersList} lastUpdate={lastUpdate} />;
    if (role === "ngo") return <NgoDashboard problems={problems} usersList={usersList} />;
    return <VolunteerDashboard problems={problems} userLoc={userLoc} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17]">
        <Navbar />
        <main className="page-wrapper pt-[120px]">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-white/5 rounded-2xl w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <SkeletonStats key={i} />)}
            </div>
            <div className="h-[400px] bg-white/5 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      
      <PageWrapper>
        <main className="page-wrapper pt-[120px] pb-20">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Command Dashboard</h1>
              <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Operational Status: <span className="text-gray-300">Active</span>
                <span className="mx-2 opacity-20">|</span>
                Role: <span className="text-indigo-400 uppercase text-[10px] font-bold tracking-widest">{user?.role || "Volunteer"}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={handleLocateAndSort} className="btn-secondary !text-xs">
                📍 {sortNearest ? "Reset Sort" : "Sort by Nearest"}
              </button>
              <Link href="/submit" className="btn-primary !text-xs">Report Crisis</Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {[
              { label: "Total Problems",  value: counts.total      },
              { label: "Volunteers",      value: counts.volunteers  },
              { label: "Field Workers",   value: counts.workers     },
              { label: "Partner NGOs",    value: counts.ngos        },
            ].map((s, i) => (
              <div key={i} className="card">
                <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">{s.label}</p>
                <p className="text-2xl font-bold text-white leading-none"><Counter value={s.value} /></p>
              </div>
            ))}
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">📈 Problem Flow</h3>
              <div className="space-y-4">
                {[
                  { label: "Open Issues", val: openCount,     dot: "bg-red-400"    },
                  { label: "In Progress", val: progressCount, dot: "bg-yellow-400" },
                  { label: "Resolved",    val: resolvedCount, dot: "bg-green-400"  },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                      <span className="text-sm text-gray-300">{r.label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">📊 Categories</h3>
              <div className="space-y-3">
                {categoryData.slice(0, 5).map(c => (
                  <div key={c.name} className="flex items-center gap-4 py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-gray-400 w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${c.percent}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400">{c.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROLE SPECIFIC EXTENSIONS */}
          <div className="mb-12">
            {renderRoleSpecific()}
          </div>

          {/* Map Section */}
          <div className="card p-0 overflow-hidden mb-12">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Live Operation Map</h3>
              <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <div className="h-[450px]">
              <MapView problems={problems} type="problems" height="100%" zoom={6} center={[22.3, 87.3]} />
            </div>
          </div>

          {/* Recent Reports */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {sortNearest ? "Nearest Solutions" : "Recent Reports"}
              </h2>
              <Link href="/problems" className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors">View All →</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProblems.slice(0, 6).map((p) => (
                <ProblemCard key={p._id} problem={p} />
              ))}
            </div>
          </div>
        </main>
      </PageWrapper>
    </div>
  );
}
