# Environment Setup Guide

Complete guide to configuring environment variables for all V-Mind workspaces.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Agent Workspace](#agent-workspace)
- [Web Workspace](#web-workspace)
- [Contracts Workspace](#contracts-workspace)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

V-Mind uses environment variables to manage configuration across three workspaces:

| Workspace | Config File | Purpose |
|-----------|-------------|---------|
| **agent** | \.env\ | Backend service configuration |
| **web** | \.env.local\ | Frontend application configuration |
| **contracts** | \.env\ | Deployment and testing configuration |

### Environment File Locations

\\\
v-mind/
├── agent/
│   ├── .env.example          # Template
│   └── .env                  # Your config (gitignored)
├── web/
│   ├── .env.example          # Template
│   └── .env.local            # Your config (gitignored)
└── contracts/
    ├── .env.example          # Template
    └── .env                  # Your config (gitignored)
\\\

---

## Quick Start

### 1. Copy Templates

\\\powershell
# Agent workspace
Copy-Item agent/.env.example agent/.env

# Web workspace
Copy-Item web/.env.example web/.env.local

# Contracts workspace
Copy-Item contracts/.env.example contracts/.env
\\\

### 2. Fill in Required Values

Edit each file with your actual values. See workspace sections below for details.

### 3. Verify Configuration

\\\ash
# Validation happens automatically on startup
npm run dev:agent    # Agent validates on start
npm run build        # Web validates on build
\\\

---

## Agent Workspace

Backend service environment configuration (\gent/.env\).

### Required Variables

| Variable | Description | Example | Sensitive |
|----------|-------------|---------|-----------|
| \STACKS_DEPLOYER_ADDRESS\ | Your Stacks address | \ST1PQHQ...\ | No |
| \STACKS_PRIVATE_KEY\ | Stacks private key | \your_key...\ | ⚠️ **YES** |
| \AI_INFERENCE_API_URL\ | AI API endpoint | \https://api.openai.com/v1\ | No |
| \AI_INFERENCE_API_KEY\ | AI API key | \sk-...\ | ⚠️ **YES** |
| \DATABASE_URL\ | PostgreSQL connection | \postgresql://...\ | ⚠️ **YES** |
| \JWT_SECRET\ | Authentication secret | \andom_32_chars\ | ⚠️ **YES** |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \NODE_ENV\ | Environment mode | \development\ |
| \PORT\ | Service port | \3001\ |
| \STACKS_NETWORK\ | Network | \	estnet\ |
| \STACKS_NODE_URL\ | Node RPC URL | \https://api.testnet.hiro.so\ |
| \HIRO_API_KEY\ | Hiro API key (optional) | \\ |
| \LOG_LEVEL\ | Logging level | \info\ |
| \SENTRY_DSN\ | Error tracking (optional) | \\ |

### Getting Values

#### Stacks Private Key

1. **For Development:**
   - Generate a new testnet wallet at [Hiro Wallet](https://wallet.hiro.so/)
   - Export your private key (Settings → Show Secret Key)
   
2. **For Production:**
   - Use a hardware wallet or secure key management system
   - **NEVER** use development keys in production

#### AI Inference API Key

1. Create account at [OpenAI](https://platform.openai.com/)
2. Navigate to API Keys section
3. Generate new secret key
4. Copy and save immediately (only shown once)

#### Database URL

1. **Local Development:**
   \\\ash
   # Install PostgreSQL
   # Create database
   createdb vmind_db
   
   # Connection string
   DATABASE_URL=postgresql://localhost:5432/vmind_db
   \\\

2. **Production:**
   - Use managed service (AWS RDS, Heroku Postgres, etc.)
   - Enable SSL: \?sslmode=require\

#### JWT Secret

Generate a strong random secret:

\\\ash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
\\\

### Validation

The agent validates environment variables on startup:

\\\	ypescript
// Automatically validated in src/config/env.ts
import { env } from './config/env';

// Throws descriptive error if variables missing
console.log(env.STACKS_PRIVATE_KEY); // Validated and typed
\\\

**Missing variables will cause startup to fail with clear error messages.**

---

## Web Workspace

Frontend application environment configuration (\web/.env.local\).

### Required Variables

All web variables must be prefixed with \NEXT_PUBLIC_\ to be exposed to the browser.

| Variable | Description | Example | Sensitive |
|----------|-------------|---------|-----------|
| \NEXT_PUBLIC_DEPLOYER_ADDRESS\ | Contract deployer address | \ST1PQHQ...\ | No |
| \NEXT_PUBLIC_API_BASE_URL\ | Agent service URL | \http://localhost:3001\ | No |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \NEXT_PUBLIC_STACKS_NETWORK\ | Network | \	estnet\ |
| \NEXT_PUBLIC_STACKS_API_URL\ | Stacks API | \https://api.testnet.hiro.so\ |
| \NEXT_PUBLIC_CONTRACT_NAME\ | Contract name | \-mind-core\ |
| \NEXT_PUBLIC_ENABLE_BETA_FEATURES\ | Beta features | \alse\ |
| \NEXT_PUBLIC_ENABLE_ANALYTICS\ | Analytics | \alse\ |
| \NEXT_PUBLIC_GA_ID\ | Google Analytics ID | \\ |

### Important Notes

#### Public Variables

⚠️ **All \NEXT_PUBLIC_*\ variables are exposed to the browser.**

- Never put secrets in \NEXT_PUBLIC_*\ variables
- These are visible in client-side code
- Safe for network names, contract addresses, API URLs

#### Private Variables

Variables without \NEXT_PUBLIC_\ prefix are server-side only:

\\\ash
# Server-side only (not accessible in browser)
DATABASE_URL=postgresql://...

# Client-side accessible (embedded in JavaScript bundle)
NEXT_PUBLIC_API_URL=http://localhost:3001
\\\

### Getting Values

#### Deployer Address

Use the same address from your agent configuration:

\\\ash
# From agent/.env
STACKS_DEPLOYER_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

# Copy to web/.env.local
NEXT_PUBLIC_DEPLOYER_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
\\\

#### API Base URL

- **Development:** \http://localhost:3001\
- **Production:** Your deployed agent service URL

### Validation

The web workspace validates environment variables at build time:

\\\ash
npm run build
# Validates all required variables
# Build fails with clear error if any missing
\\\

---

