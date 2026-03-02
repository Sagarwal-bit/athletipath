# AthletiPath 🏃‍♂️📊

AthletiPath is a full-stack Progressive Web Application designed to help students build a structured sports career pathway with performance tracking, analytics, and trust-based verification.

---

## 🚀 Features

- Secure authentication (JWT + MySQL)
- Sports career roadmap with level unlocks
- Activity & progress tracking
- Analytics dashboard (charts & metrics)
- Trust score system to reduce fake data
- Event & competition notifications
- Real email alerts (Nodemailer)
- Progressive Web App (installable)

---

## 🛠️ Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Recharts
- PWA (Service Workers)

**Backend**
- Node.js
- Express.js
- MySQL
- JWT Authentication
- Nodemailer

---

## 🧠 System Concept

AthletiPath integrates career planning with data integrity by combining:
- Structured sports roadmap
- Performance verification
- Trust scoring mechanism

---

## 📱 PWA Installation

1. Build the project:
   - `cd frontend`
   - `npm install`
   - `npm run build`
2. Serve the frontend:
   - `npm run preview`

---

## ⚙️ Local Setup

1. Clone and enter project:
   - `git clone <your-repo-url>`
   - `cd athletipath`
2. Install backend dependencies:
   - `cd backend`
   - `npm install`
3. Create `.env` in `backend/`:
   - `DB_HOST=localhost`
   - `DB_USER=root`
   - `DB_PASS=your_password`
   - `DB_NAME=athletipath`
   - `JWT_SECRET=your_jwt_secret`
   - `EMAIL_USER=your_email`
   - `EMAIL_PASS=your_email_app_password`
4. Start backend:
   - `npm run dev`
5. Start frontend in a new terminal:
   - `cd ../frontend`
   - `npm install`
   - `npm run dev`

Frontend runs on `http://localhost:5173` and backend on `http://localhost:5000`.
