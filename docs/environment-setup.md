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

