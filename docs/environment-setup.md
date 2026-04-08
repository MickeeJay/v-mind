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

## Contracts Workspace

Smart contract deployment configuration (\contracts/.env\).

### Required Variables

| Variable | Description | Example | Sensitive |
|----------|-------------|---------|-----------|
| \DEPLOYER_MNEMONIC\ | 24-word seed phrase | \word1 word2...\ | ⚠️ **CRITICAL** |
| \DEPLOYER_ADDRESS\ | Stacks address | \ST1PQHQ...\ | No |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \STACKS_NETWORK\ | Network target | \	estnet\ |
| \STACKS_NODE_URL\ | Node URL | \https://api.testnet.hiro.so\ |
| \CONTRACT_NAME\ | Contract to deploy | \-mind-core\ |
| \GAS_PRICE\ | Gas price (microSTX) | \1000\ |
| \TEST_VERBOSE\ | Verbose test output | \	rue\ |

### Getting Values

#### Deployer Mnemonic

⚠️ **EXTREMELY SENSITIVE - Your mnemonic controls all funds**

1. **For Testing (Testnet):**
   - Generate new wallet at [Hiro Wallet](https://wallet.hiro.so/)
   - Switch to Testnet
   - Export mnemonic (Settings → Show Secret Key)
   - Get testnet STX from [faucet](https://explorer.stacks.co/sandbox/faucet)

2. **For Production (Mainnet):**
   - Use hardware wallet if possible
   - Never store mnemonic in plain text
   - Use environment variable injection at deploy time
   - Consider multi-sig for contract ownership

#### Alternative: Private Key

Instead of mnemonic, you can use private key:

\\\ash
# Use either mnemonic OR private key
DEPLOYER_PRIVATE_KEY=your_64_hex_char_private_key
\\\

### Usage

\\\ash
# Deploy to testnet
cd contracts
clarinet deployments apply --network testnet

# Run tests (reads .env automatically)
clarinet test

# Check contracts
clarinet check
\\\

---

## Security Best Practices

### Critical Rules

#### 🚨 NEVER Commit Secrets

**NEVER commit these files:**
- \gent/.env\
- \web/.env.local\
- \contracts/.env\
- Any file containing real credentials

**ALWAYS commit templates:**
- \gent/.env.example\
- \web/.env.example\
- \contracts/.env.example\

#### 🔒 Sensitive Variables

These variables are **EXTREMELY SENSITIVE**:

| Variable | Risk | Protection |
|----------|------|------------|
| \STACKS_PRIVATE_KEY\ | Full account control | Never share, rotate if exposed |
| \DEPLOYER_MNEMONIC\ | Full wallet access | Hardware wallet preferred |
| \DATABASE_URL\ | Data access | Use connection pooling, SSL |
| \JWT_SECRET\ | Authentication bypass | Strong random, rotate regularly |
| \AI_INFERENCE_API_KEY\ | API abuse | Monitor usage, set limits |

### Environment File Security

#### File Permissions

\\\ash
# Restrict access to .env files (Unix/Mac)
chmod 600 agent/.env
chmod 600 web/.env.local
chmod 600 contracts/.env

# Verify gitignore
git status
# Should NOT show .env files
\\\

#### Encryption at Rest

For production secrets:

1. **Use Secret Management Services:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - GCP Secret Manager

2. **Never store secrets in:**
   - Source code
   - Docker images
   - CI/CD logs
   - Error messages
   - Git history

### Development vs Production

#### Development
- Use testnet for all blockchain operations
- Use separate API keys with low limits
- Use test databases
- Enable verbose logging

#### Production
- Use mainnet with caution
- Rotate secrets regularly
- Use managed secret storage
- Enable monitoring and alerts
- Disable debug logging

### Incident Response

#### If Secrets Are Exposed

1. **Immediate Actions:**
   \\\ash
   # 1. Rotate the compromised secret immediately
   # 2. Check for unauthorized access
   # 3. Review audit logs
   \\\

2. **Stacks Private Key Exposed:**
   - Transfer all funds to new address immediately
   - Generate new wallet
   - Update all configurations
   - Review transaction history

3. **Database Credentials Exposed:**
   - Change database password
   - Review access logs
   - Check for data exfiltration
   - Audit recent queries

4. **API Keys Exposed:**
   - Revoke compromised keys
   - Generate new keys
   - Monitor for unauthorized usage
   - Review billing for abuse

### Pre-Commit Protection

The repository includes pre-commit hooks that scan for:

- Private key patterns (64 hex characters)
- Mnemonic phrases (12/24 word sequences)
- API key formats
- Hardcoded credentials

**Never bypass with \--no-verify\ unless absolutely necessary.**

---

## Troubleshooting

### Common Issues

#### "Missing required environment variable"

**Error:**
\\\
EnvError: Missing required environment variable: "STACKS_PRIVATE_KEY"
\\\

**Solution:**
1. Check \.env\ file exists in workspace
2. Verify variable name spelling (case-sensitive)
3. Ensure no quotes around values (unless value contains spaces)
4. Restart application after changes

#### "Invalid environment variable format"

**Error:**
\\\
EnvError: Invalid url: "STACKS_NODE_URL"
\\\

**Solution:**
1. Check URL format (must include protocol: \http://\ or \https://\)
2. Remove trailing slashes
3. Verify no extra spaces

Example:
\\\ash
# Wrong
STACKS_NODE_URL=api.testnet.hiro.so

# Correct
STACKS_NODE_URL=https://api.testnet.hiro.so
\\\

#### "Next.js can't find NEXT_PUBLIC_ variable"

**Problem:**
Variable is undefined in browser but exists in \.env.local\.

**Solution:**
1. Verify variable starts with \NEXT_PUBLIC_\
2. Restart Next.js dev server (\
pm run dev\)
3. Clear \.next\ cache: \m -rf .next\
4. Rebuild: \
pm run build\

#### ".env file not loaded"

**Checklist:**
- [ ] File named exactly \.env\ (not \nv.txt\ or \.env.txt\)
- [ ] File in correct workspace directory
- [ ] No BOM (Byte Order Mark) at start of file
- [ ] Use UTF-8 encoding
- [ ] Application restarted after creating/editing

#### "Permission denied" on .env file

\\\ash
# Fix file permissions (Unix/Mac)
chmod 600 .env

# Windows: Remove inherited permissions
# Right-click → Properties → Security → Advanced
\\\

### Validation Testing

#### Test Agent Validation

\\\ash
cd agent

# Remove a required variable temporarily
# Edit .env and comment out STACKS_PRIVATE_KEY

# Try to start
npm run dev

# Should see clear error:
# "Missing required environment variable: STACKS_PRIVATE_KEY"
\\\

#### Test Web Validation

\\\ash
cd web

# Remove a required variable
# Edit .env.local and remove NEXT_PUBLIC_DEPLOYER_ADDRESS

# Try to build
npm run build

# Should fail with clear error message
\\\

### Getting Help

#### Check Environment Status

\\\ash
# Agent
cd agent
npm run dev
# Watch startup logs for validation results

# Web
cd web
npm run build
# Check build output for validation results
\\\

#### Verify Files Exist

\\\ash
# List environment files
ls -la agent/.env*
ls -la web/.env*
ls -la contracts/.env*

# Should see:
# .env.example (committed)
# .env or .env.local (gitignored)
\\\

#### Check Git Status

\\\ash
git status

# .env files should NOT appear
# If they do, they're not gitignored correctly
\\\

---

## Environment Variables Checklist

Use this checklist when setting up a new environment:

### Agent Workspace
- [ ] \gent/.env\ created from \.env.example\
- [ ] \STACKS_DEPLOYER_ADDRESS\ set
- [ ] \STACKS_PRIVATE_KEY\ set (testnet key for dev)
- [ ] \AI_INFERENCE_API_URL\ set
- [ ] \AI_INFERENCE_API_KEY\ set
- [ ] \DATABASE_URL\ set
- [ ] \JWT_SECRET\ generated (32+ chars)
- [ ] \
pm run dev\ starts without errors

### Web Workspace
- [ ] \web/.env.local\ created from \.env.example\
- [ ] \NEXT_PUBLIC_DEPLOYER_ADDRESS\ matches agent
- [ ] \NEXT_PUBLIC_API_BASE_URL\ points to agent
- [ ] \
pm run build\ succeeds

### Contracts Workspace
- [ ] \contracts/.env\ created from \.env.example\
- [ ] \DEPLOYER_MNEMONIC\ or \DEPLOYER_PRIVATE_KEY\ set
- [ ] \DEPLOYER_ADDRESS\ matches mnemonic
- [ ] \clarinet check\ succeeds

### Security
- [ ] No \.env\ files in \git status\
- [ ] All sensitive values are placeholder in \.example\ files
- [ ] File permissions restricted (600 on Unix)
- [ ] Pre-commit hooks installed
- [ ] No secrets in commit history

---

## Summary

✅ **Do:**
- Use \.env.example\ templates
- Keep secrets in \.env\ files (gitignored)
- Use testnet for development
- Rotate secrets regularly
- Enable validation
- Monitor for leaks

❌ **Don't:**
- Commit \.env\ files
- Share secrets in chat/email
- Use production keys in development
- Bypass pre-commit hooks
- Store secrets in code
- Reuse secrets across environments

---

**For additional help, see:**
- [Security Policy](../SECURITY.md)
- [Project README](../README.md)
- [Monorepo Setup Guide](../MONOREPO-SETUP.md)
