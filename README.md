# TrustFund — Crowdfunding Platform

A full-stack crowdfunding platform built with a milestone-based funding model, Stripe payment integration, escrow management, donor voting, and an asynchronous notification system. Designed to ensure transparency and accountability between campaign creators and donors.

---

## Table of Contents

- [Overview](#overview)
- [Demo Video](#demo-video)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Infrastructure & DevOps](#infrastructure--devops)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Contributors](#contributors)

---

## Overview

TrustFund is a platform where creators can launch campaigns, break them into milestones, and raise funds from donors. Funds are held in escrow and only released to creators after donors vote to confirm milestone completion — giving donors real accountability over how their money is used. Admins oversee campaign and milestone approvals to maintain platform integrity.

---

## Demo Video

[DEMO Link](https://www.linkedin.com/posts/muhammad-fasih-cs_softwareengineering-webdevelopment-fullstackdevelopment-activity-7470066115176480768-lUvZ?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAFqZJu8BVWq_GKhoARms2JZgZHPklQhKhuM)

---
## Features

### Authentication & Authorization

- Email/password registration with OTP verification
- JWT-based authentication via secure HTTP-only cookies
- Role-based access control across three roles: **Donor**, **Creator**, **Admin**
- Google OAuth 2.0 sign-in via Passport.js
- Rate limiting for security and load reduction

### Campaign Management

- Creators can create, update, delete, and submit campaigns for admin review
- Admins can approve or reject campaigns
- Public campaign browsing and detail pages
- Media/image upload support

### Milestone-Based Funding

- Creators define milestones per campaign
- Each milestone goes through an admin approval workflow
- Donors are notified when milestones are submitted for review
- Voting opens automatically upon milestone submission

### Payments & Escrow (Stripe)

- Donors contribute to specific milestones
- Backend creates a Stripe `PaymentIntent` and returns a `client_secret` to the frontend
- Stripe webhooks confirm payment success before recording a donation
- Stripe Connect onboarding for creator payout accounts
- Admins can **release escrow** to creators after milestone approval
- Admins can **issue refunds** to donors after milestone rejection

### Donor Voting

- Eligible donors (those who contributed to a milestone) can vote `yes` or `no` on milestone completion
- A cron job automatically closes voting after 24 hours
- Vote outcome triggers notifications to creators and donors

### Notifications

- Notification jobs are queued via **BullMQ** and processed by a background worker
- Notifications are persisted in **MongoDB**
- Email delivery via **Nodemailer**
- Users can fetch and mark notifications as read

---

## Tech Stack

### Backend

| Layer            | Technology                                     |
| ---------------- | ---------------------------------------------- |
| Runtime          | Node.js                                        |
| Framework        | Express.js 5                                   |
| Primary Database | PostgreSQL (master/replica with WAL streaming) |
| Document Store   | MongoDB (notifications)                        |
| Cache / Queue    | Redis + BullMQ                                 |
| Payments         | Stripe (PaymentIntents, Connect, Webhooks)     |
| Auth             | JWT, Passport.js, Google OAuth 2.0             |
| Validation       | Joi                                            |
| File Uploads     | Multer                                         |
| Email            | Nodemailer                                     |
| Scheduling       | node-cron                                      |
| Security         | Helmet, CORS, CSRF protection, Rate Limiting   |

### Frontend

| Layer         | Technology       |
| ------------- | ---------------- |
| Framework     | React 18         |
| Build Tool    | Vite             |
| Routing       | React Router     |
| HTTP Client   | Axios            |
| Payments UI   | Stripe React SDK |
| Styling       | Tailwind CSS     |
| Notifications | react-hot-toast  |
| Icons         | lucide-react     |

### Infrastructure

| Component        | Technology                               |
| ---------------- | ---------------------------------------- |
| Reverse Proxy    | Nginx (Docker)                           |
| Load Balancer    | Nginx round-robin (2 Node instances)     |
| Containerization | Docker + Docker Compose                  |
| DB Replication   | PostgreSQL WAL streaming (pg_basebackup) |
| Queue Backend    | Redis 7                                  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│              React + Vite + Stripe SDK                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP :80
┌────────────────────────▼────────────────────────────────┐
│               Nginx (Docker) — Reverse Proxy            │
│         Round-robin load balancer across 2 nodes        │
│         Special raw-body passthrough for /webhook       │
└──────────────┬──────────────────┬──────────────────────-┘
               │                  │
        :3000  │           :3001  │   (Host machine)
┌──────────────▼──┐     ┌────────▼────────┐
│  Node.js API 1  │     │  Node.js API 2  │
│  Express + Auth │     │  Express + Auth │
│  Campaigns      │     │  Campaigns      │
│  Payments etc.  │     │  Payments etc.  │
└────┬─────┬──────┘     └───┬──────┬──────┘
     │     │                │      │
     │     └────────────────┘      │
     │              │              │
  ┌──▼──┐     ┌─────▼──────┐  ┌───▼────┐
  │Redis│     │ PostgreSQL │  │MongoDB │
  │     │     │   Master   │  │        │
  │BullMQ    │  (writes)  │  │notifs  │
  └─────┘    └─────┬──────┘  └────────┘
                   │ WAL streaming
             ┌─────▼──────┐
             │ PostgreSQL │
             │  Replica   │
             │  (reads)   │
             └────────────┘
                   │
      ┌────────────▼───────────┐
      │  Notification Worker   │
      │  (BullMQ + Nodemailer  │
      │   + MongoDB persist)   │
      └────────────────────────┘
```

### Request Flow — Donation

1. Donor clicks "Fund Milestone" on the frontend
2. Request hits Nginx on port 80, routed round-robin to one of the Node instances
3. Backend creates a Stripe `PaymentIntent`, returns `client_secret`
4. Stripe React SDK collects and processes card details on the client
5. Stripe fires `payment_intent.succeeded` webhook — Nginx passes raw body to backend
6. Backend verifies Stripe webhook signature, records donation in PostgreSQL (write pool → master)

### Request Flow — Milestone Completion

1. Creator submits milestone as complete
2. Donors who contributed are notified (job queued in Redis via BullMQ)
3. Background worker processes the job — sends email, persists to MongoDB
4. Voting opens; donors cast `yes` / `no` votes
5. Cron job closes voting after 24 hours, tallies results
6. Admin approves → escrow released to creator via Stripe Transfer
7. Admin rejects → Stripe refunds issued to donors

---

## Infrastructure & DevOps

The project uses Docker Compose to manage all supporting infrastructure. The Node.js backend processes themselves run on the host machine, while Nginx, PostgreSQL, and Redis run in containers.

### Docker Services

```
docker-compose.yml
├── nginx          → Reverse proxy + load balancer  (port 80)
├── pg-master      → PostgreSQL primary / writes    (port 5433)
├── pg-replica     → PostgreSQL replica / reads     (port 5434)
└── redis          → Cache + BullMQ queue           (port 6379)

docker-compose.nginx.yml
└── nginx          → Nginx only (for lighter dev runs)
```

### Load Balancing (Nginx)

Nginx distributes incoming API traffic round-robin across two Node.js instances running on the host:

```nginx
upstream trustfund_backend {
    server host.docker.internal:3000;
    server host.docker.internal:3001;
}
```

The `/api/payments/webhook` route is handled separately to preserve the raw request body, which Stripe requires for webhook signature verification.

### PostgreSQL — Master/Replica Replication

A full streaming replication setup using PostgreSQL WAL (Write-Ahead Log):

- **pg-master** — accepts all write traffic. Configured with `wal_level = replica`, `max_wal_senders`, and `wal_keep_size`.
- **pg-replica** — read-only hot standby. On first startup, `init-replica.sh` runs `pg_basebackup` to clone the master, creates `standby.signal`, and configures `primary_conninfo` to stream WAL from the master continuously.
- The Express app routes writes to the master pool and reads to the replica pool, separating read and write load at the application layer.

```
pg-master  ──(WAL streaming)──►  pg-replica
 :5433 (writes)                   :5434 (reads)
```

### Redis

Redis 7 (Alpine) runs in Docker and serves two purposes:

- **BullMQ queue backend** — notification jobs are enqueued here and processed by the background worker
- **Caching** — used for temporary storage and cron job state during voting cycles

All services communicate over a shared Docker bridge network (`trustfund-net`).

### Starting the Stack

```bash
# Start full infrastructure (Nginx + Postgres master/replica + Redis)
docker compose -f docker-compose.yml up -d

# Or start Nginx only (if you want to manage DB/Redis separately)
docker compose -f docker-compose.nginx.yml up -d

# Then start two backend instances on the host
npm run dev:3000
npm run dev:3001
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker + Docker Compose
- Stripe account (with webhook endpoint configured)

### Installation

```bash
# Clone the repository
git clone https://github.com/Fasih-ulislam/Crowdfunding-App-Project
cd Crowdfunding-App-Project

# Install backend dependencies
cd BackEnd
npm install

# Install frontend dependencies
cd "../Frontend Tests/Tests"
npm install
```

### Running the App

```bash
# 1. Start Docker infrastructure
docker compose -f docker-compose.yml up -d

# 2. Start backend (two instances for load balancing)
npm run dev:3000
npm run dev:3001

# 3. Start frontend
cd "../Frontend Tests/Tests"
npm run dev

# API is available at http://localhost/api/...
# Frontend is available at http://localhost:5173
```

---

## Environment Variables

Create a `.env` file in `/BackEnd` with the following:

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL (matches Docker Compose ports)
PG_WRITE_URL=postgresql://user:password@localhost:5433/crowdfunding
PG_READ_URL=postgresql://user:password@localhost:5434/crowdfunding

# MongoDB
MONGO_URI=mongodb://localhost:27017/crowdfunding_notifications

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost/api/auth/google/callback

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

---

## API Overview

### Auth

| Method | Endpoint             | Description               |
| ------ | -------------------- | ------------------------- |
| POST   | `/api/auth/register` | Register with email + OTP |
| POST   | `/api/auth/login`    | Login, returns JWT cookie |
| POST   | `/api/auth/logout`   | Clear auth cookie         |
| GET    | `/api/auth/google`   | Google OAuth redirect     |

### Campaigns

| Method | Endpoint                     | Description               |
| ------ | ---------------------------- | ------------------------- |
| GET    | `/api/campaigns`             | List all public campaigns |
| GET    | `/api/campaigns/:id`         | Get campaign details      |
| POST   | `/api/campaigns`             | Create campaign (Creator) |
| PUT    | `/api/campaigns/:id`         | Update campaign (Creator) |
| DELETE | `/api/campaigns/:id`         | Delete campaign (Creator) |
| PATCH  | `/api/campaigns/:id/submit`  | Submit for admin review   |
| PATCH  | `/api/campaigns/:id/approve` | Approve campaign (Admin)  |

### Milestones

| Method | Endpoint                      | Description                 |
| ------ | ----------------------------- | --------------------------- |
| POST   | `/api/milestones`             | Add milestone to campaign   |
| PATCH  | `/api/milestones/:id/submit`  | Submit milestone for review |
| PATCH  | `/api/milestones/:id/approve` | Approve milestone (Admin)   |

### Payments

| Method | Endpoint                             | Description                        |
| ------ | ------------------------------------ | ---------------------------------- |
| POST   | `/api/payments/donate`               | Create PaymentIntent for milestone |
| POST   | `/api/payments/webhook`              | Stripe webhook handler (raw body)  |
| POST   | `/api/payments/release/:milestoneId` | Release escrow (Admin)             |
| POST   | `/api/payments/refund/:milestoneId`  | Refund donors (Admin)              |

### Votes

| Method | Endpoint                  | Description            |
| ------ | ------------------------- | ---------------------- |
| POST   | `/api/votes`              | Cast vote on milestone |
| GET    | `/api/votes/:milestoneId` | Get vote results       |

### Notifications

| Method | Endpoint                      | Description               |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/notifications`          | Fetch user notifications  |
| PATCH  | `/api/notifications/:id/read` | Mark notification as read |

---

## Project Structure

```
Crowdfunding-App-Project/
├── BackEnd/
│   ├── config/               # DB pools, Redis, Passport, Stripe config
│   ├── controllers/          # Route handler logic
│   ├── middlewares/          # Auth, validation, rate limiting
│   ├── models/               # Mongoose models (Notification)
│   ├── routes/               # Express route definitions
│   ├── services/             # Business logic (auth, payment, queue)
│   ├── workers/              # BullMQ notification worker
│   ├── utils/                # Validation helpers, cron jobs
│   ├── docker/
│   │   ├── nginx/
│   │   │   └── nginx.conf    # Reverse proxy + load balancer config
│   │   └── pg/
│   │       ├── master.conf   # PostgreSQL primary config (WAL replication)
│   │       ├── replica.conf  # PostgreSQL replica config (hot standby)
│   │       ├── pg_hba.conf   # Host-based auth (Docker network access)
│   │       └── init-replica.sh # Bootstraps replica from master on first run
│   ├── docker-compose.yml        # Full stack (Nginx + PG master/replica + Redis)
│   ├── docker-compose.nginx.yml  # Nginx only
│   ├── app.js                # Express app setup
│   └── server.js             # Entry point
│
└── Frontend Tests/Tests/
    ├── src/
    │   ├── pages/            # Route-level page components
    │   ├── components/       # Reusable UI components
    │   └── App.jsx           # Root component with routing
    ├── index.html
    └── vite.config.js
```

---

## Contributors & Work Division

This was built as a collaborative group project across four team members.

### Feature Ownership

| Feature                                        | Contributors    |
| ---------------------------------------------- | --------------- |
| Two-factor Auth System (OTP via Email + OAuth) | Fasih, Maryam   |
| Rate Limiting (security & load reduction)      | Fasih           |
| Redis — Caching & Cron Job Trials              | Sameen, Hassaan |
| Load Balancer + Distributed DB Setup           | Fasih, Sameen   |
| Dual DB Setup (MongoDB for Notifications)      | Hassaan         |
| Stripe Payment System Integration              | Fasih, Sameen   |
| Cron Jobs Setup                                | Hassaan         |

### Module Ownership

| Module                           | Contributors    |
| -------------------------------- | --------------- |
| Database Design                  | Fasih, Sameen   |
| Initial Baseline & Project Setup | Fasih           |
| Auth System                      | Fasih           |
| Role Request Workflow            | Sameen          |
| Campaigns                        | Maryam          |
| Milestones                       | Hassaan         |
| Payment System                   | Fasih, Sameen   |
| Voting System                    | Maryam, Hassaan |
| Notification System & Cron Jobs  | Hassaan         |
| Load Balancer + Distributed DB   | Fasih, Sameen   |
| Google OAuth                     | Maryam          |
| Redis & Read DB Integration      | Sameen          |

### Team

| Name                    | GitHub                                                       |
| ----------------------- | ------------------------------------------------------------ |
| Muhammad Fasih Ul Islam | [github.com/Fasih-ulislam](https://github.com/Fasih-ulislam) |
| Sameen                  | [github.com/sameenumar](https://github.com/sameenumar)       |
| Maryam                  | [github.com/umaryamm](https://github.com/umaryamm)           |
| Hassaan                 | [github.com/ihassaanadeem](https://github.com/ihassaanadeem) |

---

## License

This project is for educational purposes. All rights reserved by the contributors.
