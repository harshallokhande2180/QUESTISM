# ⟐ QUESTISM — Real-Life Leveling System

A gamified life-management and self-improvement web application inspired by the **Solo Leveling / Shadow Monarch** system interface. Transform daily habits, workouts, study goals, and self-care routines into hunter quests with real-time progression and live status tracking.

---

## ✦ Features Overview

### 1. ⚔️ Daily Quest Engine (`/routine`)
- **Core Quests:** Structured daily goals for workouts, mindfulness, self-care, and deep study blocks.
- **Custom Quests:** Add on-the-fly bonus objectives during your day.
- **Tomorrow's Quests (Lock-In):** Commit to quests for the next day in advance; once the logical day rolls over, they become locked in to keep you accountable.
- **Streak & Leveling:** Real-time completion progress tracking with system alerts.

### 2. 💪 Body Status & Workout Tracker (`/body`)
- **Calisthenics & Strength:** Track progression for Push-ups, Squats, and Pull-ups with baseline benchmarking.
- **Auto-Lock Mechanism:** Lock entered reps to prevent accidental changes, with an easy edit/unlock toggle whenever adjustments are needed.
- **Mission Cleared Checkbox:** Confirm each exercise once targets are achieved; automatically syncs status to your daily quest.
- **Dynamic Target Scaling:** Automatic +30 rep progression every 10 active days.

### 3. 🏃 Cardio & Live Distance Calculator
- **Custom Target Distance:** Set distance goals (default: 10 km daily run).
- **Live GPS Distance Calculator:** Built-in geolocation tracking using high-accuracy coordinates to track actual distance covered in real time.
- **Automated Timer & Stopwatch:** Calculates duration, pace (`min/km`), and speed (`km/h`) automatically upon mission completion.
- **Treadmill / Simulation Mode:** Quick-add controls for indoor or stationary workouts.

### 4. ✨ Self-Care Protocol (`/care`)
- **Morning & Night Skin Care:** Dedicated step-by-step checklists (Cleanser, Toner, Moisturizer, Sunscreen, Treatments).
- **Neck & Posture Stretches:** Structured ergonomic stretch routines to counter long screen sessions.

### 5. 📚 Study Module (`/study`)
- **Systematic Mastery:** Topic-by-topic tracking across key computer science & engineering subjects (Operating Systems, Machine Learning, Software Engineering, Data Engineering).
- **Unit Breakdown:** Track progress across 20 units and 175 granular topics.

### 6. 🛡️ Hunter Status HUD (`/status`)
- **Live Stat Radar (Hexagon Chart):** Visualizes 6 core attributes:
  - **STR (Strength):** Calisthenics completion
  - **END (Endurance):** Cardio distance logged
  - **FLEX (Flexibility):** Posture & stretch routines
  - **CARE (Self-Care):** Skin health adherence
  - **DISC (Discipline):** Overall daily quest completion rate
  - **INT (Intelligence):** Completed study topics
- **Power Rating & Arc Level:** Overall hunter power level updates in real-time as you complete quests.

---

## 🛠️ Technology Stack

- **Frontend Framework:** React 19 (Vite)
- **Styling:** Vanilla CSS design system with Tailwind CSS v4 utility support
- **Animations:** Framer Motion & custom HUD micro-animations
- **Typography:** Orbitron & Inter (Google Fonts)
- **State Management:** Zustand & Local-First persistence
- **Backend / Auth:** Supabase (optional cloud sync) with automatic offline `localStorage` fallback

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/harshallokhande2180/QUESTISM.git
   cd QUESTISM
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. Build for production:
   ```bash
   npm run build
   ```

---

## 🌐 Cloud Backend Setup (Optional)

The application functions 100% offline using client-side storage by default. To connect a live Supabase backend:

1. Create a project at [supabase.com](https://supabase.com).
2. Create a `.env` file in the root folder:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart the dev server (`npm run dev`).

---

## 📜 License
Distributed under the MIT License.