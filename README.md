# V-Mind

**Bitcoin L2 DeFi Strategy Automation Platform**

V-Mind is a decentralized finance (DeFi) strategy automation platform built on the Stacks blockchain, bringing sophisticated trading strategies to Bitcoin's Layer 2 ecosystem.

---

## 🏗️ Architecture

This is a **monorepo** containing three interconnected workspaces:

```
v-mind/
├── contracts/     # Clarity smart contracts (Clarinet)
├── agent/         # Backend automation service (Node.js + TypeScript)
├── web/           # Frontend application (Next.js + React)
└── [config files] # Shared tooling configuration
```

### Workspaces

| Workspace | Description | Tech Stack |
|-----------|-------------|------------|
| **contracts** | Smart contracts for on-chain strategy execution | Clarity, Clarinet |
| **agent** | Backend service for strategy monitoring and execution | Node.js 20, TypeScript, Stacks.js |
| **web** | User-facing web application | Next.js 14, React 18, Tailwind CSS |

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.11.0+ | JavaScript runtime |
| **npm** | 10.0.0+ | Package manager |
| **Git** | 2.0+ | Version control |
| **Clarinet** | Latest | Stacks smart contract development |

#### Installation Links
- Node.js: https://nodejs.org/ (Use the LTS version)
- Clarinet: https://docs.hiro.so/clarinet/installation
- Git: https://git-scm.com/

### 1. Initial Setup

Install all workspace dependencies:

Install all workspace dependencies:

```powershell
npm install
```

Or using Make:

```bash
make install
```

### 2. Configure Environment

Copy the environment template and configure your local environment:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your configuration:

```bash
# Stacks Configuration
STACKS_NETWORK=testnet
STACKS_PRIVATE_KEY=your_private_key_here

# Application Settings
NODE_ENV=development
PORT=3000
```

**⚠️ Never commit the `.env` file - it's automatically ignored.**

### 3. Start Development

Start all development servers:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:agent    # Backend agent service
npm run dev:web      # Frontend application
npm run dev:contracts # Clarinet console
```

---

## 📦 Workspace Details

### Contracts (`contracts/`)

Clarity smart contracts for the V-Mind platform.

```bash
cd contracts

# Check contracts
clarinet check

# Run tests
clarinet test

# Interactive console
clarinet console
```

**Key Files:**
- `Clarinet.toml` - Project configuration
- `contracts/v-mind-core.clar` - Main contract
- `tests/` - Contract tests

### Agent (`agent/`)

Backend service for strategy automation and blockchain interaction.

```bash
cd agent

# Development mode (with hot reload)
npm run dev

# Build
npm run build

# Run tests
npm run test

# Type checking
npm run type-check
```

**Key Files:**
- `src/index.ts` - Entry point
- `src/types/` - TypeScript type definitions
- `src/services/` - Business logic
- `tsconfig.json` - TypeScript configuration with path aliases

**Path Aliases:**
```typescript
import { StrategyConfig } from '@/types';
import { executeStrategy } from '@/services/strategy';
```

### Web (`web/`)

Next.js frontend application with App Router.

```bash
cd web

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

**Key Files:**
- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Utility functions
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration

**Features:**
- ✅ App Router (Next.js 14)
- ✅ TypeScript with strict mode
- ✅ Tailwind CSS
- ✅ Stacks wallet integration ready

---

## 🛠️ Development Commands

### Root-Level Commands

```bash
# Install all dependencies
npm install
make install

# Start all development servers
npm run dev
make dev

# Build all workspaces
npm run build
make build

# Run all tests
npm run test
make test

# Lint all workspaces
npm run lint
make lint

# Format all code
npm run format
make format

# Type check all workspaces
npm run type-check

# Clean build artifacts
npm run clean
make clean
```

### Workspace-Specific Commands

```bash
# Agent workspace
npm run dev:agent
npm run test:agent
npm run build:agent

# Web workspace
npm run dev:web
npm run test:web
npm run build:web

# Contracts workspace
npm run test:contracts
```

---

## 🔧 Configuration

### ESLint

Shared ESLint configuration enforces:
- TypeScript best practices
- Import ordering (alphabetical, grouped)
- Consistent code style
- No unused variables

Config: `.eslintrc.js`

### Prettier

Consistent code formatting across all workspaces:
- 2-space indentation
- Single quotes
- 100-character line width
- Trailing commas (ES5)

Config: `.prettierrc`

### TypeScript

All workspaces use TypeScript with **strict mode** enabled:
- `noUncheckedIndexedAccess`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- Full type safety

---

## 🔒 Security

This repository follows security-first principles:

### Protected Secrets

The `.gitignore` protects:
- ✅ Private keys (all formats)
- ✅ Mnemonic seed phrases
- ✅ Environment variables (`.env*`)
- ✅ API keys and tokens
- ✅ Wallet configurations
- ✅ NPM/Yarn credentials

See `SECURITY.md` for complete security guidelines.

## 📚 Documentation

- **SECURITY.md** - Security policy and best practices
- **SETUP-COMPLETE.md** - Detailed setup documentation
- **contracts/README.md** - Smart contract documentation
- **agent/README.md** - Agent service documentation
- **web/README.md** - Frontend documentation

---

## 🧪 Testing

### Run All Tests

```bash
npm run test
```

### Workspace-Specific Tests

```bash
# Contracts
cd contracts
clarinet test --coverage

# Agent
cd agent
npm run test:coverage

# Web
cd web
npm run test
```

---

## 🚢 Deployment

### Smart Contracts

Deploy to testnet:
```bash
cd contracts
clarinet deployments apply -p deployments/testnet.yaml
```

Deploy to mainnet:
```bash
clarinet deployments apply -p deployments/mainnet.yaml
```

### Agent Service

Build and deploy:
```bash
cd agent
npm run build
npm start
```

### Web Application

Build for production:
```bash
cd web
npm run build
npm start
```

---

## 🤝 Contributing

### Before You Commit

- [ ] Run `npm run lint` - No linting errors
- [ ] Run `npm run type-check` - No TypeScript errors
- [ ] Run `npm run test` - All tests pass
- [ ] Run `npm run format` - Code is formatted
- [ ] Review `git diff --staged` - No secrets committed
- [ ] Check `git status` - No `.env` files staged

### Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
chore: maintenance tasks
refactor: code restructuring
test: add or update tests
style: formatting changes
```

---

## 📖 Resources

### Stacks Ecosystem
- [Stacks Documentation](https://docs.stacks.co/)
- [Clarinet Documentation](https://docs.hiro.so/clarinet/)
- [Stacks.js Documentation](https://stacks.js.org/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)

### Development Tools
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🆘 Troubleshooting

### Clarinet not found
Install Clarinet: https://docs.hiro.so/clarinet/installation

### Node version mismatch
Use the correct Node version:
```bash
nvm use
# or
nvm install
```

### Port already in use
Change the port in `.env`:
```bash
PORT=3001
```

---

**Built with ❤️ for the Bitcoin L2 ecosystem**

