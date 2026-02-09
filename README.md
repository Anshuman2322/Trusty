# TrustLens – Secure & Transparent Feedback Verification System (Demo)

This is a demo-ready full-stack project with **three UI roles** and a backend trust scoring engine.

## Tech

- Frontend: React (Vite)
- Backend: Node.js + Express
- DB: MongoDB (Mongoose)

## Run (Windows)

1) Start MongoDB locally (default): `mongodb://127.0.0.1:27017/trustlens`

2) (Optional) Create env file:

- Copy [backend/.env.example](backend/.env.example) → `backend/.env`

3) Seed demo data:

`npm run seed`

4) Run frontend + backend:

`npm run dev`

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000/api/health`

## Demo notes

- No login/authentication (UI-only role separation).
- Emails are simulated and printed in the backend console.
- Blockchain anchoring is simulated: only hash + tx reference are stored.
