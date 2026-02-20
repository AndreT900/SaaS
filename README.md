# Multitool Enterprise SaaS Platform

A modular, multi-tenant SaaS platform built with a **microservices architecture**, designed to provide companies with a suite of internal productivity tools accessible through a single, unified interface.

## 🚀 Overview

Multitool is a B2B platform that allows a **Superadmin** to onboard companies via activation tokens. Each company's admin can manage their users, assign granular tool access, and use real-time enterprise services like Chat, Meetings, Documents, Calendar, and an AI Assistant.

## 🏗️ Architecture

```
multitool/
├── frontend/              # React (Vite) SPA
├── services/
│   ├── core/              # Auth, User & Company management (port 8000)
│   ├── chat/              # Real-time messaging (port 8001)
│   ├── meetings/          # Video meetings & transcription (port 8002)
│   ├── documents/         # File storage & sharing (port 8003)
│   ├── calendar/          # Events & scheduling (port 8004)
│   └── ai_engine/         # AI assistant powered by Groq (port 8005)
└── docker-compose.yml
```

## ⚙️ Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18, Vite, TailwindCSS, Framer Motion    |
| Backend   | FastAPI (Python), Pydantic v2                 |
| Auth      | JWT (python-jose), bcrypt                     |
| Database  | MongoDB (Atlas cloud)                         |
| AI        | Groq API (LLaMA/Mixtral)                      |
| DevOps    | Docker, Docker Compose                        |

## 🔑 Key Features

- **Multi-tenant isolation**: Each company's data is strictly scoped by `company_id`
- **Granular permissions**: Admins assign per-user tool access encoded directly in JWT tokens
- **Dynamic navigation**: The sidebar renders only the services a user is authorized to use
- **Role-based access**: `superadmin` → `company_admin` → `employee`
- **AI Assistant**: Floating chat bubble available across the entire dashboard

## 🛠️ Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- A MongoDB Atlas connection string
- A Groq API key

### Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Run with Docker

```bash
docker-compose up --build
```

### Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## 🔐 First Login

1. Log in as **Superadmin** using the credentials in your `.env` (`SUPER_ADMIN_KEY`)
2. Create a company — an activation link is returned
3. Navigate to the activation link to set the company admin password
4. The company admin can then create employees and assign tool access

## 📄 License

MIT License — Copyright 2026 AndreT900. See [LICENSE](./LICENSE).
