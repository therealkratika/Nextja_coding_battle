# ⚔️ Coding Battle Arena

A real-time multiplayer coding battle platform where developers can create or join coding rooms, compete against opponents, solve programming problems, and track their battle progress.

🔗 **Live Frontend:** https://nextja-coding-battle.vercel.app/
🔗 **GitHub Repository:** https://github.com/therealkratika/Nextja_coding_battle

---

## 🚀 Overview

**Coding Battle Arena** is a multiplayer competitive programming platform designed to make coding practice more interactive and competitive.

Instead of solving problems alone, users can enter a battle room with another participant and compete by solving coding problems within the same battle environment.

The platform includes:

* Create coding battle rooms
* Join existing rooms
* Multiplayer battle flow
* Difficulty selection
* Multiple programming questions
* Real-time battle communication
* Coding editor
* Code submission and judging architecture
* Leaderboard/battle results
* Backend API integration
* Code execution using **Piston**

---

## ✨ Features

### 🏠 Create Battle Room

Users can create a new battle room by providing their username and configuring the battle.

The battle system supports different difficulty levels:

* Easy
* Medium
* Hard
* Random

Users can also configure the number of questions for the battle.

---

### 🚪 Join Battle Room

Players can join an existing battle using a unique room code.

The application stores the username and room information using browser session storage to maintain the player's battle session.

---

### ⚔️ Multiplayer Battles

The application is designed around real-time multiplayer coding battles.

Players can:

* Enter the same battle room
* View battle information
* Participate in coding challenges
* Submit solutions
* Compete against other players

---

### 💻 Online Coding Environment

The project integrates a coding editor for writing and submitting solutions.

The execution architecture supports programming languages such as:

* C++
* C
* Java
* Python
* JavaScript

The editor and submission flow are connected to the backend API.

---

### 🧪 Code Execution with Piston

The project uses **Piston** as the code execution engine.

Piston provides the isolated environment required to compile and execute submitted programs.

For local development, I have **self-hosted Piston locally using Docker**, and the compiler works successfully.

The local Piston instance exposes:

```text
http://localhost:2000
```

and the execution endpoint is:

```text
http://localhost:2000/api/v2/execute
```

The locally hosted Piston instance has been tested successfully with languages including C++, Java, Python, and JavaScript.

### ⚠️ Deployment Limitation

The frontend and backend of the project are deployed, but the **compiler is currently not available on the live deployment**.

The reason is that Piston needs a separately hosted execution environment for production. Hosting a permanent Piston server requires additional server infrastructure/cost, and I have not deployed a paid production Piston instance.

Therefore:

```text
Local Development
Frontend → Backend → Local Piston → Code Execution ✅

Live Deployment
Frontend → Backend → Piston
                         ❌
              No permanent Piston server
```

The compiler functionality works correctly when running the project locally with the self-hosted Piston instance.

The Piston integration remains implemented in the project and can be enabled for production by providing a publicly accessible Piston-compatible execution endpoint through the backend `PISTON_URL` environment variable.

---

## 🏗️ Project Structure

```text
Nextja_coding_battle/
│
├── frontend/
│   ├── app/
│   │   ├── create-battle/
│   │   ├── join-battle/
│   │   └── lobby/
│   │       └── [roomId]/
│   │
│   ├── components/
│   ├── lib/
│   │   └── api.ts
│   │
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── pistonService.js
│   │   └── judgeService.js
│   │
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── INTEGRATION_GUIDE.md
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend

* **Next.js**
* **React**
* **TypeScript**
* **CSS**
* **Monaco Editor**

### Backend

* **Node.js**
* **Express.js**
* **Socket.IO**
* **MongoDB**
* **Mongoose**

### Code Execution

* **Piston**
* **Docker**

### Deployment

* **Vercel** — Frontend
* **Render** — Backend
* **MongoDB Atlas** — Database

---

## 🔄 Application Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    │     Browser         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Vercel        │
                    │   Next.js Frontend  │
                    └──────────┬──────────┘
                               │
                    REST API / Socket.IO
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Render        │
                    │   Express Backend   │
                    └──────┬────────┬─────┘
                           │        │
                           │        ▼
                           │  ┌──────────────┐
                           │  │   MongoDB    │
                           │  │    Atlas     │
                           │  └──────────────┘
                           │
                           ▼
                    ┌─────────────────────┐
                    │       Piston        │
                    │ Code Execution API  │
                    │      :2000          │
                    └─────────────────────┘
```

For local development, Piston runs on the developer machine using Docker.

---

## 🔌 Backend API

The backend provides APIs for managing battle rooms.

### Create Battle

```http
POST /api/battle/create
```

Creates a new coding battle room.

---

### Join Battle

```http
POST /api/battle/join
```

Allows a player to join an existing battle using the room code.

---

### Get Battle

```http
GET /api/battle/:roomCode
```

Fetches the current battle information using the room code.

---

### Leave Battle

```http
POST /api/battle/leave
```

Allows a player to leave a battle room.

---

### Code Submission

The backend sends submitted code to the configured Piston execution server.

The Piston execution endpoint is configured through:

```env
PISTON_URL=http://localhost:2000/api/v2/execute
```

For production, this can be replaced with a hosted Piston-compatible endpoint.

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/therealkratika/Nextja_coding_battle.git

cd Nextja_coding_battle
```

---

## 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5001

MONGODB_URI=your_mongodb_connection_string

FRONTEND_URL=http://localhost:3000

PISTON_URL=http://localhost:2000/api/v2/execute
```

Start the backend:

```bash
node server.js
```

The backend will run on:

```text
http://localhost:5001
```

---

## 3. Setup Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:3000
```

---

## 4. Setup Piston Locally

Piston can be self-hosted using Docker.

After starting Piston, verify that it is running:

```bash
docker ps
```

Piston should be available at:

```text
http://localhost:2000
```

Check installed runtimes:

```bash
curl http://localhost:2000/api/v2/runtimes
```

The project uses Piston to compile and execute submitted code.

---

## 🧪 Testing Code Execution

A sample C++ execution request:

```bash
curl -X POST http://localhost:2000/api/v2/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "c++",
    "version": "10.2.0",
    "files": [
      {
        "name": "main.cpp",
        "content": "#include <iostream>\nusing namespace std;\nint main(){ cout << \"Hello BattleArena\"; return 0; }"
      }
    ]
  }'
```

If Piston is running correctly, it returns the compilation and execution result.

---

## 🔐 Environment Variables

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

For the deployed frontend:

```env
NEXT_PUBLIC_API_URL=https://nextja-coding-battle.onrender.com
```

### Backend

```env
PORT=5001
MONGODB_URI=your_mongodb_uri
FRONTEND_URL=http://localhost:3000
PISTON_URL=http://localhost:2000/api/v2/execute
```

> Never commit `.env` files, database credentials, API keys, or other secrets to GitHub.

---

## 🌐 Deployment

### Frontend

The frontend is deployed on **Vercel**.

Live URL:

```text
https://nextja-coding-battle.vercel.app/
```

### Backend

The backend is deployed on **Render**.

Backend URL:

```text
https://nextja-coding-battle.onrender.com
```

### Database

The project uses **MongoDB Atlas** for cloud database storage.

### Compiler

The Piston compiler is currently **self-hosted locally** for development and testing.

A permanent hosted Piston server has not been deployed because production hosting for the code-execution environment requires additional infrastructure.

---

## 📚 Current Status

| Feature                      | Status                    |
| ---------------------------- | ------------------------- |
| Next.js Frontend             | ✅ Deployed                |
| Backend API                  | ✅ Deployed                |
| MongoDB                      | ✅ Configured              |
| Create Battle                | ✅                         |
| Join Battle                  | ✅                         |
| Battle Lobby                 | ✅                         |
| Real-time architecture       | ✅                         |
| Monaco Editor                | ✅                         |
| Piston Integration           | ✅                         |
| Local Code Execution         | ✅                         |
| Production Code Execution    | ⚠️ Requires hosted Piston |
| C++ Execution Locally        | ✅                         |
| Java Execution Locally       | ✅                         |
| Python Execution Locally     | ✅                         |
| JavaScript Execution Locally | ✅                         |

---

## 🔮 Future Improvements

* Deploy a dedicated Piston execution server
* Enable production code execution
* Add more programming languages
* Improve real-time battle synchronization
* Add comprehensive leaderboards
* Add battle history
* Add user profiles and statistics
* Add rating/ELO system
* Add time-based scoring
* Add anti-cheating mechanisms
* Improve execution limits and sandbox security
* Add persistent user authentication

---

## 🎯 Learning Outcomes

Through this project, I worked with:

* Full-stack application architecture
* Next.js application development
* REST API integration
* Express.js backend development
* MongoDB and Mongoose
* Socket.IO and real-time communication
* Monaco Editor integration
* Docker-based code execution
* Piston compiler integration
* API error handling
* Environment variable management
* Vercel deployment
* Render deployment
* Cloud database integration

---

## 👩‍💻 Author

**Kratika Gupta**

BTech CSE Student

GitHub:
https://github.com/therealkratika

---

## ⭐ Project

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

**Coding Battle Arena — Enter a room. Face your opponent. Solve faster.**
