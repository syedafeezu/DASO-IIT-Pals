# DASO - Dynamic Appointment & Slot Optimization System

**IIT PALS Innovation Prototype**

DASO is a Smart Banking Flow Management System that eliminates physical queues using an ML-driven scheduling engine. It dynamically allocates slots and priorities based on customer urgency, staff efficiency, and real-time bank load.

---

## 🚀 How to Run the Prototype

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Start the Backend Server (ML & API)
This handles the ML predictions, priority queuing logic, and database.

```bash
cd backend
# Install Python dependencies
pip install -r requirements.txt

# Start the server (and generate synthetic data automatically)
python -m uvicorn main:app --reload
```
*API will be running at: `http://localhost:8000`*

### 2. Start the Frontend Application (Kiosk & Dashboards)
This launches the web interface for the Kiosk, Staff, and Manager views.

```bash
cd frontend
# Install Node dependencies
npm install

# Start the development server
npm run dev
```
*App will be running at: `http://localhost:5173`*

---

## 🖥️ Using the Prototype (Judges Guide)

Open `http://localhost:5173` in your browser. You will see a landing page with links to three main views:

### 1. Smart Kiosk View (`/kiosk`)
- **Walk-in:** Click "New Token" → Enter Mobile → Select Service (Try Voice Input by clicking the Mic and saying "Cash Deposit").
- **Check-in:** Click "I have an Appt" → Enter a mobile number to simulate beacon detection (Simulated).

### 2. Staff Dashboard (`/staff`)
- Shows the current customer being served with a **Real-time Performance Bar** (comparing actual vs. ML-predicted time).
- Use **Start**, **Complete**, and **No Show** buttons to process customers.
- "Up Next" sidebar shows the **Priority-Sorted Queue**.

### 3. Manager Analytics (`/admin`)
- View real-time metrics, heatmaps, and staff efficiency scores.

---

## 🧠 Core Features Implemented

* **ML Duration Prediction:** `ml_engine.py` trains a RandomForest model on 1000 synthetic records to predict service times based on Age, Service Type, Time of Day, etc.
* **Priority Weighted Algorithm:** 
    * `Lost_Card` (+50 pts), `Disabled` (+30 pts), `Senior` (+20 pts).
    * Dynamic Time Decay: Priority increases as they wait.
* **Smart Merging Logic:** High-priority walk-ins can jump the queue but never delay appointments by more than 10 minutes (Buffer Rule).
* **Voice-Enabled Kiosk:** Uses Web Speech API for accessible service selection.

---

## 🛠️ Tech Stack
- **Frontend:** React + Vite, Tailwind CSS, Lucide Icons
- **Backend:** FastAPI (Python), SQLite
- **ML:** Scikit-Learn (RandomForestRegressor)
