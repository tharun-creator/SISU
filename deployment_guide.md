# SISU Booking System Deployment Guide

This guide details how to build, configure, and deploy the SISU Mentorship Platform to production cloud environments. 

---

## 🏗️ Architectural Topology

```mermaid
graph LR
    A[Vercel / Static CDN] -->|Secure Client HTTPS| B[FastAPI Web Instance]
    B -->|PyMySQL/SQLAlchemy| C[Managed MySQL Database]
    B -->|Gemini SDK & LangGraph| D[Cognitive Intelligence Node]
    B -->|Zapier Hooks| E[Zapier & Calendar Automation]
```

---

## 🗄️ Database Provisioning

The platform is designed to connect to any managed MySQL instance (AWS RDS, Aiven, PlanetScale, Heroku MySQL, etc.).

1. **Database Schema Setup**:
   The backend automatically creates all necessary tables on startup via SQLAlchemy `Base.metadata.create_all(bind=engine)`.
2. **Environment Variable**:
   Configure the database URL using the following format:
   ```env
   DATABASE_URL=mysql+pymysql://<user>:<password>@<host>:<port>/<database_name>?ssl_verify_cert=true
   ```

---

## 🚀 Backend Cloud Deployment

### Option A: Render (Recommended)
1. Sign in to [Render](https://render.com/) and click **New > Web Service**.
2. Connect your Git repository.
3. Configure the following environment fields:
   *   **Runtime**: `Python`
   *   **Build Command**: `pip install -r requirements.txt`
   *   **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT`
4. Add the required environment variables in the Render console (see checklist below).

### Option B: Heroku
1. Initialize the Heroku CLI and create your application:
   ```bash
   heroku create sisu-booking-api
   ```
2. Set the python runtime (detected via `runtime.txt`) and deploy:
   ```bash
   git push heroku main
   ```
   *Heroku will automatically build the environment using `requirements.txt` and launch the web process using the declared `Procfile`.*

### Option C: Docker Containerization
If containerizing for AWS ECS, Google Cloud Run, or Azure App Service, create the following `Dockerfile` in the `/backend` folder:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]
```

---

## 💻 Frontend Static Deployment

The frontend React application is fully compiled and ready to be served on CDNs like **Vercel** or **Netlify**:

1. **Production Build Command**:
   ```bash
   npm run build
   ```
   *This compiles all source modules, HSL styled CSS sheets, and Framer Motion transitions into `/dist` in under 3 seconds.*
2. **Vercel Deployment**:
   *   Connect your repository to Vercel.
   *   Set the **Framework Preset** to `Vite`.
   *   Set the **Build Command** to `npm run build`.
   *   Set the **Output Directory** to `dist`.
   *   Under environment variables, set:
       ```env
       VITE_API_URL=https://your-production-backend-api.com
       ```

---

## 📋 Environment Variables Checklist

Ensure these variables are loaded on the active production server instance:

### Backend Variables

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string | `mysql+pymysql://admin:secret@aws-rds.com:3306/sisu_db` |
| `GEMINI_API_KEY` | Key for support assistant cognitive node | `AIzaSyB-YourActualGeminiKey` |
| `JWT_SECRET` | Secret key for client JWT sessions | `a-super-secret-secure-32-byte-hex-key` |
| `ALLOWED_ORIGINS` | Permitted origins for backend CORS filter | `https://sisu-mentorship.vercel.app` |
| `ZAPIER_WEBHOOK_URL` | Outgoing Zapier calendar sync webhook | `https://hooks.zapier.com/hooks/catch/.../` |
| `FRONTEND_URL` | Hosted frontend URL (used to generate password reset links) | `https://sisu-mentorship.vercel.app` |
| `RESEND_API_KEY` | Resend API Key for dispatching email notifications | `re_aBcD1234...` |
| `FROM_EMAIL` | Verified sending email domain address | `onboarding@resend.dev` or `no-reply@yourdomain.com` |

### Frontend Variables

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL of the hosted backend server | `https://sisu-booking-backend.onrender.com` |
