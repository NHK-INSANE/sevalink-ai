"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "./components/Navbar";
import TiltCard from "./components/TiltCard";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const WORDS = ["Volunteers", "NGOs", "Resources", "Responders"];

function useTypewriter(words, speed = 80, pause = 1800) {
  const [text, setText] = useState("");
  const [wi, setWi] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wi % words.length];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, text.length + 1));
        if (text.length + 1 === word.length) setTimeout(() => setDeleting(true), pause);
      } else {
        setText(word.slice(0, text.length - 1));
        if (text.length - 1 === 0) { setDeleting(false); setWi(w => w + 1); }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, deleting, wi, words, speed, pause]);
  return text;
}

function DotGrid() {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(99,102,241,0.18)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(60% 50% at 50% 50%, transparent 20%, var(--bg-main) 100%)" }} />
    </div>
  );
}

const FEATURES = [
  { icon: "📍", title: "Report & Locate", desc: "Submit crisis reports with precise GPS coordinates and photo evidence in seconds.", color: "#6366f1" },
  { icon: "🤖", title: "AI Classification", desc: "Neural engine instantly classifies urgency level and predicts required resources.", color: "#a855f7" },
  { icon: "🚀", title: "Smart Matching", desc: "Proprietary algorithm matches nearest volunteers with the right skills to each crisis.", color: "#06b6d4" },
  { icon: "🗺️", title: "Live Operations Map", desc: "Real-time geospatial view of all active incidents, volunteers, and NGO assets.", color: "#10b981" },
  { icon: "📡", title: "SOS Broadcast", desc: "One-tap emergency broadcast alerts all nearby responders simultaneously.", color: "#f59e0b" },
  { icon: "🤝", title: "NGO Coordination", desc: "Seamless multi-organization collaboration with shared dashboards and assignments.", color: "#ec4899" },
];

const PROBLEMS = [
  { icon: "⏱", title: "Coordination Lag", text: "Traditional disaster response loses critical hours to phone calls and paperwork." },
  { icon: "🕳", title: "No Visibility", text: "Field teams operate blind — no real-time view of who needs what, and where." },
  { icon: "❌", title: "Skill Mismatch", text: "Aid reaches the wrong people. Medical teams at flood zones, engineers at medical camps." },
];

const STEPS = [
  { num: "01", title: "Report the Crisis", desc: "Any citizen submits a problem with location, photo, and description. Takes 30 seconds." },
  { num: "02", title: "AI Analyzes", desc: "Our model classifies urgency, category, and required resources automatically." },
  { num: "03", title: "Match & Deploy", desc: "Nearest qualified volunteers and NGOs are notified and dispatched instantly." },
  { num: "04", title: "Track & Resolve", desc: "All parties coordinate on a live map until the crisis is marked resolved." },
];

function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(start);
        }, 24);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Landing() {
  const [stats, setStats] = useState({ users: 0, problems: 0 });
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);
  const typed = useTypewriter(WORDS);

  function TypedWord() {
    return (
      <span style={{
        background: "var(--primary-gradient)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        {typed}
        <span style={{ borderRight: "3px solid #818cf8", marginLeft: 2, animation: "blink 1s step-end infinite" }} />
      </span>
    );
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  const fadeUp = {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-primary)", overflowX: "hidden" }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", position: "relative", overflow: "hidden" }}>
        {/* Ambient orbs */}
        <motion.div animate={{ y: [0,-24,0], opacity:[0.12,0.22,0.12] }} transition={{ repeat:Infinity, duration:9, ease:"easeInOut" }}
          style={{ position:"absolute", top:"10%", left:"20%", width:520, height:520, background:"#6366f1", borderRadius:"50%", filter:"blur(120px)", pointerEvents:"none" }} />
        <motion.div animate={{ y:[0,20,0], opacity:[0.08,0.16,0.08] }} transition={{ repeat:Infinity, duration:11, ease:"easeInOut", delay:1.5 }}
          style={{ position:"absolute", bottom:"10%", right:"18%", width:580, height:580, background:"#a855f7", borderRadius:"50%", filter:"blur(140px)", pointerEvents:"none" }} />

        <DotGrid />
        <motion.div style={{ y: heroY, position:"relative", zIndex:10, maxWidth:860 }}>
          {/* Live badge */}
          <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.6 }}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"7px 18px", borderRadius:99, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)", marginBottom:36 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px rgba(34,197,94,0.7)", animation:"pulse 2s infinite" }} />
            <span style={{ fontSize:11, fontWeight:700, color:"#818cf8", letterSpacing:"0.12em", textTransform:"uppercase" }}>Live Disaster Response Network</span>
          </motion.div>

          <motion.h1 initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.1, ease:[0.22,1,0.36,1] }}
            style={{ fontSize:"clamp(44px,8vw,88px)", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1.05, marginBottom:28,
              background:"linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.85) 40%,#a78bfa 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Connecting
            <span style={{ display:"block", minHeight:"1.1em" }}>
              <TypedWord />
            </span>
            Where It Matters.
          </motion.h1>

          <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.25 }}
            style={{ fontSize:"clamp(16px,2vw,20px)", color:"var(--text-secondary)", maxWidth:620, margin:"0 auto 48px", lineHeight:1.7, fontWeight:400 }}>
            SevaLink AI intelligently matches volunteers, NGOs, and resources to real-time crises — powered by neural matching and live geospatial tracking.
          </motion.p>

          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, delay:0.4 }}
            style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/register">
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                style={{ padding:"15px 36px", fontSize:16, fontWeight:700, background:"var(--primary-gradient)", color:"white", border:"none", borderRadius:14, cursor:"pointer", boxShadow:"0 8px 40px rgba(99,102,241,0.45)", display:"flex", alignItems:"center", gap:8 }}>
                🚀 Get Started Free
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                style={{ padding:"15px 36px", fontSize:16, fontWeight:600, background:"rgba(255,255,255,0.05)", color:"var(--text-primary)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, cursor:"pointer", backdropFilter:"blur(12px)" }}>
                View Live Dashboard →
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}
          style={{ position:"absolute", bottom:36, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:"0.1em", textTransform:"uppercase" }}>Scroll</span>
          <motion.div animate={{ y:[0,8,0] }} transition={{ repeat:Infinity, duration:1.5 }}
            style={{ width:1.5, height:36, background:"linear-gradient(to bottom, rgba(99,102,241,0.8), transparent)", borderRadius:4 }} />
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF NUMBERS ── */}
      <section style={{ padding:"80px 24px", borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:40 }}>
          {[
            { val: stats.problems || 135, suffix:"+", label:"Active Crisis Reports", color:"#818cf8" },
            { val: stats.users || 80, suffix:"+", label:"Registered Responders", color:"#34d399" },
            { val: 12, suffix:"+", label:"Partner NGOs", color:"#f59e0b" },
            { val: 95, suffix:"%", label:"AI Match Accuracy", color:"#ec4899" },
          ].map((s,i) => (
            <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay:i*0.1 }}
              style={{ textAlign:"center" }}>
              <div style={{ fontSize:"clamp(40px,5vw,60px)", fontWeight:900, color:s.color, letterSpacing:"-0.04em", lineHeight:1 }}>
                <AnimatedCounter target={s.val} suffix={s.suffix} />
              </div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM SECTION ── */}
      <section style={{ padding:"120px 24px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign:"center", marginBottom:72 }}>
            <div style={{ display:"inline-block", fontSize:11, fontWeight:700, color:"#f87171", letterSpacing:"0.12em", textTransform:"uppercase", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", padding:"5px 16px", borderRadius:99, marginBottom:20 }}>
              The Problem
            </div>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:16 }}>
              Crisis Response is Broken
            </h2>
            <p style={{ color:"var(--text-secondary)", fontSize:17, maxWidth:580, margin:"0 auto", lineHeight:1.7 }}>
              Every year, delayed coordination costs lives. Traditional systems are too slow, too blind, too fragmented.
            </p>
          </motion.div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:24 }}>
            {PROBLEMS.map((p,i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay:i*0.12 }}
                style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.12)", borderRadius:20, padding:32, position:"relative", overflow:"hidden" }}>
                <div style={{ fontSize:40, marginBottom:20 }}>{p.icon}</div>
                <h3 style={{ fontSize:20, fontWeight:700, marginBottom:10 }}>{p.title}</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.7 }}>{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION: FEATURES ── */}
      <section style={{ padding:"120px 24px", background:"rgba(99,102,241,0.02)", borderTop:"1px solid rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign:"center", marginBottom:72 }}>
            <div style={{ display:"inline-block", fontSize:11, fontWeight:700, color:"#818cf8", letterSpacing:"0.12em", textTransform:"uppercase", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", padding:"5px 16px", borderRadius:99, marginBottom:20 }}>
              The Solution
            </div>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:16,
              background:"linear-gradient(135deg,#fff 30%,#a78bfa 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              Everything You Need to Respond
            </h2>
            <p style={{ color:"var(--text-secondary)", fontSize:17, maxWidth:560, margin:"0 auto", lineHeight:1.7 }}>
              A complete AI-powered coordination platform — from crisis report to field deployment.
            </p>
          </motion.div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20 }}>
            {FEATURES.map((f,i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay:i*0.08 }}>
                <TiltCard className="!p-7 !rounded-[20px]">
                  <div style={{ width:52, height:52, borderRadius:16, background:`${f.color}18`, border:`1px solid ${f.color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:20 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize:17, fontWeight:700, marginBottom:10, color:"var(--text-primary)" }}>{f.title}</h3>
                  <p style={{ color:"var(--text-secondary)", fontSize:13.5, lineHeight:1.7 }}>{f.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:"120px 24px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign:"center", marginBottom:72 }}>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:16 }}>
              How SevaLink Works
            </h2>
            <p style={{ color:"var(--text-secondary)", fontSize:17, maxWidth:500, margin:"0 auto" }}>Four steps from crisis to resolution.</p>
          </motion.div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:24, position:"relative" }}>
            {STEPS.map((s,i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay:i*0.1 }}
                style={{ position:"relative" }}>
                <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:32, height:"100%" }}>
                  <div style={{ fontSize:48, fontWeight:900, color:"rgba(99,102,241,0.15)", letterSpacing:"-0.04em", lineHeight:1, marginBottom:16 }}>{s.num}</div>
                  <h3 style={{ fontSize:18, fontWeight:700, marginBottom:12 }}>{s.title}</h3>
                  <p style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.7 }}>{s.desc}</p>
                </div>
                {i < STEPS.length-1 && (
                  <div style={{ position:"absolute", top:40, right:-14, width:28, height:2, background:"linear-gradient(to right,rgba(99,102,241,0.4),transparent)", display:"none" }} className="hidden lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES SECTION ── */}
      <section style={{ padding:"120px 24px", background:"rgba(255,255,255,0.01)", borderTop:"1px solid rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign:"center", marginBottom:64 }}>
            <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:16 }}>Built for Every Responder</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:17, maxWidth:500, margin:"0 auto" }}>Whether individual or institutional — SevaLink scales with you.</p>
          </motion.div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
            {[
              { icon:"👤", role:"Citizens", desc:"Report local problems. Track resolution. Be the first to act.", color:"#6366f1" },
              { icon:"🤝", role:"Volunteers", desc:"Get matched by AI to crises that need your exact skills.", color:"#10b981" },
              { icon:"🔧", role:"Field Workers", desc:"Receive deployment orders and coordinate with teams in real-time.", color:"#f59e0b" },
              { icon:"🏢", role:"NGOs", desc:"Command your resources, track impact, coordinate multi-agency ops.", color:"#ec4899" },
            ].map((r,i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay:i*0.1 }} whileHover={{ y:-4 }}
                style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:28, textAlign:"center", transition:"all 0.3s ease" }}>
                <div style={{ width:60, height:60, borderRadius:18, background:`${r.color}18`, border:`1px solid ${r.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 18px" }}>{r.icon}</div>
                <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>{r.role}</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:13.5, lineHeight:1.6 }}>{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* ── MAP PREVIEW ── */}
      <section style={{ padding:"100px 24px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <motion.div {...fadeUp} style={{ textAlign:"center", marginBottom:48 }}>
            <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:12 }}>
              Operational Visibility
            </h2>
            <p style={{ color:"var(--text-secondary)", fontSize:16 }}>
              Real-time command interface — every incident, every responder, live.
            </p>
          </motion.div>

          <motion.div {...fadeUp} style={{ position:"relative", borderRadius:24, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
            <img src="/map-preview.png" alt="SevaLink Live Operations Map" style={{ width:"100%", display:"block", filter:"brightness(0.85)" }} />
            {/* Glass overlay */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(2,6,23,0.8) 0%, transparent 50%)" }} />
            <div style={{ position:"absolute", bottom:32, left:0, right:0, textAlign:"center" }}>
              <Link href="/map">
                <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                  style={{ padding:"12px 32px", fontSize:14, fontWeight:700, background:"rgba(255,255,255,0.1)", color:"white", border:"1px solid rgba(255,255,255,0.2)", borderRadius:12, cursor:"pointer", backdropFilter:"blur(16px)" }}>
                  🗺️ Open Live Map →
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding:"140px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:700, height:700, background:"radial-gradient(circle,rgba(99,102,241,0.15),transparent 65%)", pointerEvents:"none" }} />
        <motion.div {...fadeUp} style={{ position:"relative", zIndex:10, maxWidth:760, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(38px,6vw,72px)", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1.05, marginBottom:24 }}>
            Ready to Save Lives<br />
            <span style={{ background:"linear-gradient(135deg,#6366f1,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Technologically?</span>
          </h2>
          <p style={{ fontSize:18, color:"var(--text-secondary)", marginBottom:48, lineHeight:1.7, maxWidth:520, margin:"0 auto 48px" }}>
            Join the network of smarter responders. Every second counts — and SevaLink makes every second count more.
          </p>
          <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/register">
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                style={{ padding:"16px 48px", fontSize:17, fontWeight:700, background:"var(--primary-gradient)", color:"white", border:"none", borderRadius:14, cursor:"pointer", boxShadow:"0 8px 48px rgba(99,102,241,0.5)" }}>
                🚀 Join SevaLink — Free
              </motion.button>
            </Link>
            <Link href="/login">
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                style={{ padding:"16px 36px", fontSize:17, fontWeight:600, background:"rgba(255,255,255,0.05)", color:"var(--text-primary)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, cursor:"pointer" }}>
                Sign In
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"48px 24px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", flexDirection:"column", alignItems:"center", gap:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:"var(--primary-gradient)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:17, letterSpacing:"-0.02em" }}>SevaLink<span style={{ color:"#818cf8" }}> AI</span></span>
          </div>
          <div style={{ display:"flex", gap:32, flexWrap:"wrap", justifyContent:"center" }}>
            {[
              { href:"/dashboard", label:"Dashboard" },
              { href:"/problems",  label:"Problems"  },
              { href:"/volunteers",label:"Helpers"   },
              { href:"/map",       label:"Map"       },
              { href:"/ai-match",  label:"AI Match"  },
              { href:"/register",  label:"Register"  },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize:13, color:"var(--text-muted)", transition:"color 0.2s" }} className="hover:text-white">{label}</Link>
            ))}
          </div>
          <p style={{ fontSize:12, color:"var(--text-muted)", letterSpacing:"0.06em" }}>
            © 2026 SevaLink AI · Built for impact
          </p>
        </div>
      </footer>
    </div>
  );
}
