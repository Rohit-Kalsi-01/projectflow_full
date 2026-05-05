# 🚀 ProjectFlow — Team Project Management App

A full-stack project management application with role-based access control, Kanban boards, and real-time task tracking.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios, react-hot-toast, date-fns |
| Backend | Node.js, Express.js |
| Database | MongoDB (via Mongoose ODM) |
| Auth | JWT (7-day expiry) + bcryptjs |
| Deployment | Railway (separate services) |

---

## ✨ Features

### Authentication
- Signup / Login with JWT
- Protected routes (frontend + backend)
- Profile management

### Projects
- Create projects with name, description, color, due date
- View progress bar (tasks completed %)
- Archive / delete projects (Admin only)

### Role-Based Access Control
| Action | Admin | Member |
|--------|-------|--------|
| Create tasks | ✅ | ✅ |
| Edit any task | ✅ | ✅ |
| Delete any task | ✅ | Own only |
| Invite members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Delete project | ✅ | ❌ |
| Edit project | ✅ | ❌ |

### Task Management
- Create, edit, delete tasks
- Status: `To Do → In Progress → Review → Done`
- Priority: Low / Medium / High / Urgent
- Assign to team members
- Due dates with overdue detection
- Kanban board + List view

### Dashboard
- Stats: Total projects, tasks, in-progress, completed, overdue
- Recent activity feed
- Overdue tasks highlight

---

## 🗂️ Project Structure

```
projectflow/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── users.js
│   ├── middleware/
│   │   ├── auth.js          # JWT verification
│   │   └── projectRole.js   # RBAC middleware
│   ├── server.js
│   ├── package.json
│   └── railway.toml
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/layout/Layout.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProjectsPage.jsx
    │   │   ├── ProjectDetailPage.jsx
    │   │   ├── MyTasksPage.jsx
    │   │   └── ProfilePage.jsx
    │   ├── utils/api.js
    │   ├── App.jsx
    │   └── index.css
    ├── package.json
    └── railway.toml
```

---

## 🌐 Deploying to Railway

### Prerequisites
- [Railway account](https://railway.app)
- [MongoDB Atlas](https://mongodb.com/atlas) free cluster
- Your project code pushed to GitHub

---

### Step 1: Create MongoDB Atlas Database

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. Create a database user (username + password)
3. Whitelist IP: `0.0.0.0/0` (allow all — Railway uses dynamic IPs)
4. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/projectflow
   ```

---

### Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository → choose the **`backend`** folder (or root of backend service)
3. Railway will detect it's a Node.js app automatically
4. Go to **Variables** tab and set:

   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/projectflow
   JWT_SECRET=your_random_64_char_secret_here
   FRONTEND_URL=https://your-frontend.railway.app
   ```

5. Under **Settings → Networking**, click **Generate Domain**
6. Note your backend URL: `https://projectflow-backend-xxx.railway.app`

---

### Step 3: Deploy Frontend to Railway

1. In Railway, create **another service** → from same GitHub repo → **`frontend`** folder
2. Set environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app
   ```
   > Replace with the actual backend URL from Step 2
3. Railway will run `npm install && npm run build` automatically
4. Add start command in **Settings**: `npx serve -s build -p $PORT`
5. Generate domain → your app is live!

---

### Step 4: Update CORS

Back in your backend Railway service, update `FRONTEND_URL` to your frontend's Railway URL:
```
FRONTEND_URL=https://projectflow-frontend-xxx.railway.app
```

Redeploy the backend service (Railway does this automatically on env var changes).

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Projects
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/projects` | Get all user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project + tasks |
| PUT | `/api/projects/:id` | Update project (Admin) |
| DELETE | `/api/projects/:id` | Delete project (Admin) |
| POST | `/api/projects/:id/members` | Add member (Admin) |
| PUT | `/api/projects/:id/members/:uid` | Update role (Admin) |
| DELETE | `/api/projects/:id/members/:uid` | Remove member (Admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/my` | My assigned tasks |
| GET | `/api/tasks/dashboard` | Dashboard stats |
| GET | `/api/tasks/project/:projectId` | Tasks in project |
| POST | `/api/tasks/project/:projectId` | Create task |
| GET | `/api/tasks/:id` | Get task detail |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

---

## 🧑‍💻 Local Development

```bash
# Clone repo
git clone <your-repo-url>
cd projectflow

# Backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev     # Runs on :5000

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
# Set REACT_APP_API_URL=http://localhost:5000
npm install
npm start       # Runs on :3000
```

---

## 🔐 Security Notes

- Passwords hashed with bcryptjs (salt rounds: 12)
- JWT expires in 7 days
- All protected routes require `Authorization: Bearer <token>` header
- Role checks enforced server-side (never trust frontend)
- Input validation with express-validator on all POST/PUT routes
- MongoDB injection prevented by Mongoose schema typing

---

## 📦 Environment Variables Summary

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | Random secret for JWT signing | ✅ |
| `PORT` | Server port (Railway sets automatically) | Optional |
| `FRONTEND_URL` | Frontend URL for CORS | Recommended |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_URL` | Backend URL (no trailing slash) | ✅ |
