# Sisu Booking System - Developer Guide

Welcome to the Sisu Mentorship Booking platform! This guide provides a high-level overview of the application architecture, data flows, and configuration steps to help you get up to speed quickly.

---

## 🏗️ Architecture & Tech Stack

This project is structured as a decoupled **Client-Server** application.

### 1. Frontend (Vite + React)
Located in the `frontend/` directory.
* **Framework:** React 18 powered by Vite for rapid HMR (Hot Module Replacement).
* **Styling:** Custom "Apple/Ivory" aesthetic. Uses vanilla CSS (`index.css`) for the core design system and layouts, augmented by Tailwind CSS. 
* **Key Directories:**
  * `src/components/`: Reusable UI components (Sidebar, Chat, Modals).
  * `src/pages/`: Main views (`ClientDashboard`, `AdminDashboard`, Auth pages).
  * `src/lib/api.js`: The central Axios instance that handles all HTTP requests to the backend.

### 2. Backend (FastAPI + Python)
Located in the `backend/` directory.
* **Framework:** FastAPI (Asynchronous web framework).
* **Database ORM:** SQLAlchemy.
* **Core Integrations:**
  * **LLM Engine (`llm.py`):** Uses Google's Gemini (`google-generativeai`) to power the concierge chatbot.
  * **Calendar (`calendar_service.py`):** Integrates with Google Calendar API using Service Account credentials.
  * **Email/Notifications (`email_service.py`):** Handles dispatching of transactional emails and Webhooks (e.g., Zapier integrations).

---

## 🔄 Core Application Flow

1. **Authentication:** 
   The user logs in via `Login.jsx`. The frontend sends credentials to `POST /auth/login`. The backend validates against the DB and returns a JWT token. The frontend stores this token in `localStorage` and attaches it to all subsequent requests via `api.js`.
2. **Booking a Session:**
   From `ClientDashboard`, a user selects a time slot. `api.js` fires a `POST /meetings/` request. The backend (`main.py`) validates the slot, creates a database record (status: `pending`), and triggers an email/webhook notification.
3. **Admin Review:**
   The admin views `AdminDashboard.jsx`. They can Approve, Decline, or Reschedule. Approving triggers `calendar_service.py` to inject the event into Google Calendar and notifies the user.
4. **AI Concierge:**
   The floating chat widget sends user messages to `POST /chat`. `llm.py` constructs a system prompt context and calls the Gemini API, streaming or returning the response.

---

## ⚙️ Configuration & Environment Variables

If you need to change the database, switch API keys, or update the LLM provider, you will do this via the `.env` files.

### Backend Configuration (`backend/.env`)

To change the database connection, locate the `.env` file in the `backend/` directory.

```env
# --- DATABASE CONFIGURATION ---
# Format: mysql+pymysql://<user>:<password>@<host>:<port>/<dbname>
# Change this URL if you want to point to a local MySQL DB or a new cloud provider (like AWS RDS, PlanetScale, etc.)
DATABASE_URL=mysql+pymysql://avnadmin:...@sisu-booking-...aivencloud.com:12102/defaultdb

# --- SECURITY ---
# Secret key used to sign JWT tokens. Change this in production!
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# --- API KEYS ---
# Google Gemini API Key for the AI Chatbot
GEMINI_API_KEY=AIzaSy...

# Zapier Webhook URL (used in email_service.py to trigger external automations)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
```

### Frontend Configuration (`frontend/.env`)
```env
# Points the React app to the FastAPI server. Change this if the backend is hosted elsewhere.
VITE_API_URL=http://localhost:8000
```

---

## 🛠️ Common Developer Tasks

### 1. Changing the Database
If you want to migrate off Aiven Cloud to a local database for testing:
1. Install MySQL locally or use Docker: `docker run --name sisu-mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql`
2. Update `backend/.env`: `DATABASE_URL=mysql+pymysql://root:root@localhost:3306/sisu_db`
3. Restart the backend. SQLAlchemy `Base.metadata.create_all(bind=engine)` is called in `main.py`, so the tables will auto-generate!

### 2. Updating Mobile Responsiveness
We recently deployed a global CSS fix to ensure the application is mobile-friendly. 
* Do **not** manually edit the 300+ `style={{ display: 'flex' }}` inline tags. 
* Instead, look at the bottom of `frontend/src/index.css` under the `@media (max-width: 768px)` block. It dynamically forces large `flex` layouts to wrap into columns using CSS attribute selectors.

### 3. Running the Project Locally
Open two terminal instances at the project root:

**Terminal 1 (Backend):**
```bash
# Activate the virtual environment
cd backend
. \..\.venv\Scripts\Activate.ps1
# Run FastAPI server
python run_backend.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
