# SevaLink AI: Disaster Response & Civic Stabilization Platform 🌍

SevaLink AI is a production-grade disaster response and civic coordination platform designed to bridge the gap between affected citizens, NGOs, and volunteers during crises. By leveraging **Google Gemini AI**, it automates the triage of reports, matches skills to needs, and provides real-time situational awareness.

---

## 🚀 Core Features

### 1. Smart Triage (AI-Powered)
- **Automatic Urgency Detection**: Uses Gemini AI to analyze problem descriptions and assign urgency levels (Critical, High, Medium, Low) and categorization.
- **Skill Extraction**: Identifies the specific expertise needed (Medical, Logistics, Rescue) to resolve the issue.

### 2. Real-Time Crisis Map
- **Interactive Leaflet Visualization**: View active problems globally with urgency-coded markers.
- **Dynamic Sorting**: Problems are ranked using a scoring algorithm that combines urgency and time elapsed (Priority Boosting).

### 3. Smart Matching System
- **Volunteer Matchmaking**: Automatically notifies the top 5 nearest volunteers with matching skills when a new problem is reported.
- **Auto-Assignment**: Crisis reports are instantly assigned to the best-fit NGO worker or volunteer.

### 4. Live Coordination
- **SOS Broadcast**: Instant, one-click emergency broadcast to all nearby active users.
- **Discussion Panels**: Real-time communication between reporters and assigned helpers using Socket.io.

---

## 🛠️ Tech Stack

### Backend (The Brain)
- **Express 5**: High-performance Node.js framework.
- **MongoDB Atlas**: Scalable cloud database for real-time persistence.
- **Socket.io**: bidirectional low-latency communication.
- **Google Generative AI**: Powering the intelligence layer.

### Frontend (Interface)
- **Next.js (App Router)**: Blazing fast React framework.
- **Framer Motion**: Premium, smooth UI animations.
- **Tailwind CSS**: Professional, consistent design system.
- **Leaflet.js**: Lightweight, robust mapping engine.

---

## 🔧 Architecture & Security

- **JWT Authentication**: Secure, token-based user sessions.
- **CORS Hardening**: Strict origin control for cross-domain safety between Vercel and Render.
- **Rate Limiting**: Protection against DDoS and SOS broadcast spam.
- **Role-Based Access (RBAC)**: Defined permissions for Users, Volunteers, NGOs, and Workers.

---

## 📈 Deployment Status

- **Frontend**: [https://sevalink-ai.vercel.app](https://sevalink-ai.vercel.app)
- **Backend**: [https://sevalink-backend-bmre.onrender.com](https://sevalink-backend-bmre.onrender.com)

---

## 👨‍💻 Quick Start for Developers

1. **Clone the Repo**
2. **Environment Setup**:
   - Create `backend/.env`: `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`.
   - Create `frontend/.env.local`: `NEXT_PUBLIC_API_URL`.
3. **Install & Run**:
   - `npm install` in both directories.
   - `npm run dev` to launch the ecosystem.

---

*Built with ❤️ for Global Resilience.*
