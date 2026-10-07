# Professional Network

A full-stack professional networking web app (a small LinkedIn-style platform). Users create a professional profile, find and connect with other people, and share posts with images, likes and comments.

Built with **Next.js + Redux Toolkit** on the frontend and a **Node.js / Express REST API + MongoDB** on the backend.

![Feed](docs/screenshots/feed.png)

| Profile | Discover people | Mobile |
| --- | --- | --- |
| ![Profile](docs/screenshots/profile.png) | ![Discover](docs/screenshots/discover.png) | ![Mobile feed](docs/screenshots/mobile-feed.png) |

## Features

**Accounts & security**
- Register and log in with email + password (passwords hashed with bcrypt)
- Session-token authentication: random 256-bit tokens, stored **hashed (SHA-256)** with an expiry, sent as `Authorization: Bearer` headers; up to 5 devices per user; logout revokes only the current session
- Protected pages redirect to login (and back again afterwards); expired sessions are detected and cleared automatically
- Rate limiting on login/register and on the whole API, Helmet security headers, CORS restricted to the frontend origin

**Profiles**
- Headline, location, about, skills, work experience and education
- Profile photo upload (resized to 400×400 WebP on the server)
- View any member's profile with their connection and post counts
- Download a profile as a formatted **PDF resume**

**Network**
- Search people by name, username, headline, skill or location (paginated)
- Send, accept, ignore and withdraw connection requests; remove connections
- Duplicate, reverse-duplicate and self requests are blocked on the server
- "People you may know" suggestions and a pending-invitations badge in the navbar

**Feed**
- Create posts with text and/or an image; edit and delete your own posts (with confirmation)
- Paginated feed ("Show more posts") and a per-user activity list on each profile
- Like / unlike with optimistic UI updates (one like per user, enforced in the database)
- Comments: add, list, delete (comment author or post owner)

**UX**
- Responsive layout for mobile (bottom navigation), tablet and desktop
- Loading, empty and error states with retry on every data view; toast notifications; accessible dialogs, labels and focus styles

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16 (Pages Router), React 19 with React Compiler, Redux Toolkit, Axios, CSS Modules |
| Backend | Node.js (ES modules), Express 5, Mongoose 9, bcrypt, Multer, sharp, PDFKit, Helmet, express-rate-limit, Morgan |
| Database | MongoDB (MongoDB Atlas in production) |
| Testing | Node.js built-in test runner + Supertest (API integration tests) |
| Deployment | Vercel (frontend), Render (backend, `render.yaml` blueprint), MongoDB Atlas (database) |

## Architecture

```
Browser ──► Next.js frontend (Vercel)
              │  Redux Toolkit store (auth, posts, connections)
              │  Axios client: adds "Authorization: Bearer <token>", handles 401s
              ▼
            Express REST API (Render)
              routes → middleware (auth, upload, rate limit) → controllers → services
              │                                         (media, PDF, connections)
              ▼
            MongoDB Atlas
              users · profiles · posts · comments · connectionrequests · media
```

- **Auth flow:** `POST /api/auth/login` returns a random token. The client stores it in `localStorage` and sends it as a Bearer header. The server stores only a SHA-256 hash of each token with an expiry date, so a database leak does not expose usable sessions. Header-based auth (instead of cookies) works when the frontend and API live on different domains.
- **Images:** uploads are validated, resized and re-encoded to WebP with `sharp` (which also strips EXIF/GPS metadata) and stored in MongoDB, then served from `GET /media/:id` with long-lived cache headers. This keeps uploads working on hosts with an ephemeral filesystem such as Render's free tier.
- **Posts state:** posts are normalised in Redux (`entities` + per-list id arrays), so liking a post on a profile page also updates it in the feed.
- **Validation:** every write endpoint whitelists and validates its fields (no mass-assignment), and checks ownership/permissions on the server.

## API overview

All `/api/*` routes except register, login and health require `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account (returns a session token) |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Revoke the current session |
| GET | `/api/auth/me` | Current user + profile |
| GET | `/api/users?search=&page=&limit=` | Search people |
| GET | `/api/users/suggestions` | People you may know |
| GET | `/api/users/:username` | Public profile, connection status, stats |
| PATCH | `/api/users/me` | Update name / username |
| PATCH | `/api/users/me/profile` | Update headline, location, about, skills, experience, education |
| POST / DELETE | `/api/users/me/avatar` | Upload / remove profile photo |
| GET | `/api/users/:id/resume` | Download profile as PDF |
| GET | `/api/connections` | My connections |
| GET | `/api/connections/requests?type=received\|sent` | Pending requests |
| POST | `/api/connections/requests` | Send a request `{ userId }` |
| PATCH | `/api/connections/requests/:id` | Accept / reject `{ action }` (receiver only) |
| DELETE | `/api/connections/requests/:id` | Withdraw a request (sender only) |
| DELETE | `/api/connections/:userId` | Remove a connection |
| GET | `/api/posts?page=&limit=&author=` | Feed / a user's posts |
| POST | `/api/posts` | Create post (multipart: `body`, `media`) |
| PATCH / DELETE | `/api/posts/:id` | Edit / delete own post |
| POST / DELETE | `/api/posts/:id/like` | Like / unlike |
| GET / POST | `/api/posts/:id/comments` | List / add comments |
| DELETE | `/api/comments/:id` | Delete comment (author or post owner) |
| GET | `/media/:id` | Serve an uploaded image |
| GET | `/api/health` | Health check (API + database) |

`backend/api.http` contains ready-made requests for the VS Code REST Client extension.

## Local development

**Requirements:** Node.js 20.9+ and a MongoDB database (a free MongoDB Atlas cluster or a local `mongod`).

1. **Clone**
   ```bash
   git clone https://github.com/muhammadjunaidfarooq/fullstack-professional-network.git
   cd fullstack-professional-network
   ```
2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Environment variables**
   ```bash
   cp backend/.env.example backend/.env            # then set MONGO_URI
   cp frontend/.env.example frontend/.env.local
   ```
4. **Database** — no migrations are needed; collections and indexes are created on first start. Optionally load demo data (4 users, posts, comments, connections; password `password123`):
   ```bash
   cd backend && npm run seed
   ```
5. **Run** (two terminals)
   ```bash
   cd backend && npm run dev      # API on http://localhost:9090
   cd frontend && npm run dev     # app on http://localhost:3000
   ```

### Useful scripts

| Folder | Command | What it does |
| --- | --- | --- |
| backend | `npm run dev` | Start the API with auto-restart (`node --watch`) |
| backend | `npm start` | Start the API (production) |
| backend | `npm test` | Run the API integration tests (needs MongoDB, see below) |
| backend | `npm run seed` | Insert demo data (refuses to run in production) |
| frontend | `npm run dev` | Start Next.js in development mode |
| frontend | `npm run lint` | ESLint (Next.js + React Compiler rules) |
| frontend | `npm run build` / `npm start` | Production build / serve it |

### Tests

`backend/tests/` contains 29 integration tests (auth, sessions, validation, profiles, uploads, search, connection lifecycle, posts, likes, comments, permissions, CORS). Each test file creates a throw-away database and drops it afterwards.

```bash
cd backend
npm test
```

By default the tests use a local MongoDB at `mongodb://127.0.0.1:27017`. To use another server (for example a separate Atlas cluster), set `MONGO_URI_TEST` in `backend/.env`. Each run creates databases named `pn_test_…` and drops them when it finishes, so never point it at a server where those names matter.

## Environment variables

**backend/.env**

| Name | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (required) |
| `PORT` | Port to listen on (default `9090`; Render sets it automatically) |
| `CLIENT_ORIGIN` | Allowed frontend origin(s) for CORS, comma-separated, no trailing slash |
| `NODE_ENV` | `development` / `production` / `test` |
| `SESSION_TTL_DAYS` | How long a login stays valid (default `7`) |
| `TRUST_PROXY` | Set to `1` behind a reverse proxy (Render, Railway) so rate limiting sees real client IPs |
| `MONGO_URI_TEST` | Optional — MongoDB server used by `npm test` |

**frontend/.env.local**

| Name | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend, e.g. `https://your-api.onrender.com` |

## Deployment

The recommended free setup is **MongoDB Atlas + Render (API) + Vercel (frontend)**.

1. **Database (MongoDB Atlas)**
   - Create a free cluster and a database user with a strong password.
   - Network Access: Render's free tier has no fixed outbound IPs, so allow `0.0.0.0/0` (access is still protected by the username/password).
   - Copy the connection string and add a database name, e.g. `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/professional-network?retryWrites=true&w=majority`.
2. **Backend (Render)**
   - New → **Blueprint** → select this repository (uses `render.yaml`), or create a Web Service manually with *Root Directory* `backend`, *Build* `npm ci`, *Start* `npm start`, *Health check* `/api/health`.
   - Set `MONGO_URI` and `CLIENT_ORIGIN` (your Vercel URL, e.g. `https://professional-network.vercel.app`). `NODE_ENV=production` and `TRUST_PROXY=1` are set by the blueprint.
   - Note: free Render services sleep after inactivity, so the first request can take ~30–60 s.
3. **Frontend (Vercel)**
   - Import the repository, set *Root Directory* to `frontend` (framework is detected automatically).
   - Add `NEXT_PUBLIC_API_URL` = your Render URL. The build fails on Vercel if it is missing, so a production build can never silently call `localhost`.
4. After the first Vercel deploy, make sure the exact Vercel URL is in the backend's `CLIENT_ORIGIN`, then redeploy the backend.

## Project structure

```
backend/
  app.js            Express app (middleware, routes, error handling)
  server.js         Connects to MongoDB and starts the server
  config/           Environment + database connection
  controllers/      Route handlers (auth, users, connections, posts, media)
  middleware/       Auth (Bearer sessions), uploads, error handler
  models/           Mongoose schemas
  routes/           Express routers
  services/         Image processing/storage, PDF resume, connection helpers
  scripts/seed.js   Demo data
  tests/            API integration tests
frontend/src/
  pages/            Routes: /, /login, /dashboard, /discover, /my_connections, /profile/[username], /settings
  layout/           UserLayout (navbar) and DashboardLayout (protected 3-column layout)
  Components/       Navbar, PostCard + comments, CreatePost, ConnectionButton, UserCard, Toast, dialogs…
  config/           Axios client + Redux store, actions (thunks) and reducers
docs/screenshots/   README images
render.yaml         Render blueprint for the API
```

## Possible improvements

- Real-time updates (WebSockets) for notifications and messaging
- Email verification and password reset
- Moving images to object storage (S3 / Cloudinary) for larger scale
- End-to-end tests in CI (GitHub Actions)
