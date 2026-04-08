# Security Policy - V-Mind Stacks Project

## Overview

This document outlines the security practices and policies for the V-Mind Stacks Bitcoin L2 full-stack project. Security is our highest priority, and this repository has been configured from inception to prevent accidental exposure of sensitive data.

## Protected Secret Categories

This repository's `.gitignore` is configured to prevent the following categories of sensitive information from being committed to version control:

### 1. Private Keys (CRITICAL)
- **Stacks wallet private keys** - Any file containing Stacks account private keys
- **Bitcoin private keys** - Bitcoin wallet keys in any format (.key, .pem, .der, .p12, .pfx)
- **Mnemonic seed phrases** - 12/24-word recovery phrases in any format (.txt, .json, .seed, .mnemonic)
- **Keystore files** - Encrypted keystore files that protect private keys
- **Certificate private keys** - SSL/TLS private keys and certificates

**Never commit files with these patterns:**
- `*.key`, `*.pem`, `*.private`, `*private-key*`, `*wallet-key*`
- `*.seed`, `*.mnemonic`, `*mnemonic*`, `*seed-phrase*`
- `*keystore*`, `*secret*`, `*password*`

### 2. Environment Variables & Configuration
- **All `.env` files** - Including `.env.local`, `.env.production`, `.env.development`, `.env.test`, and any variant
- **Local configuration files** - Files matching `config.local.*`, `*.local.json`, `*.secret.yaml`
- **Environment backups** - Any `.env.backup`, `.env.bak`, or `.env.old` files

**All secrets must be injected via environment variables at runtime.** Never hard-code:
- API endpoints with embedded tokens
- Database connection strings with credentials
- Service account credentials
- OAuth client secrets
- JWT signing keys

### 3. Stacks & Clarinet Specific Files
- **Deployer wallet configurations** - `deployer-wallet.*`, `deployer.json`
- **Clarinet wallet files** - Generated wallet JSON files with private keys
- **Settings files** - `settings/Devnet.toml`, `settings/Testnet.toml`, `settings/Mainnet.toml`
- **Deployment receipts** - Contract deployment receipts that may contain account information
- **Local network state** - `.clarinet/deployments/`, devnet state directories

### 4. Package Manager Credentials
- **NPM authentication** - `.npmrc` files containing registry auth tokens
- **Yarn credentials** - `.yarnrc`, `.yarnrc.yml` files with registry authentication
- **Registry tokens** - `*.npmtoken`, `*.registrycred`, auth token files

**Never commit package manager credentials.** Use:
- Environment variable `NPM_TOKEN` for CI/CD
- Local `.npmrc` for development (already ignored)
- Organization-level registry authentication

### 5. API Keys & Service Credentials
- **API key files** - Any file matching `api-keys.*`, `*api-keys*`, `secrets.*`
- **Service account keys** - Cloud provider service account JSON/YAML files
- **Authentication tokens** - OAuth tokens, session tokens, JWT tokens
- **Database credentials** - Connection strings, passwords, authentication files

### 6. Development Artifacts (that may leak secrets)
- **IDE configuration** - VSCode `settings.json`/`launch.json` that may embed environment variables
- **Editor temporary files** - Vim swaps, Emacs backups that may contain secrets during editing
- **Build outputs** - Compiled files that may embed environment variables at build time
- **Log files** - Application logs that may contain request headers, tokens, or debug output
- **Coverage reports** - Test coverage that may capture environment state

## Contributor Guidelines

### NEVER Hard-Code Credentials

❌ **WRONG:**
```typescript
const STACKS_PRIVATE_KEY = "a1b2c3d4e5f6..."; // NEVER DO THIS
const API_KEY = "sk_live_abc123..."; // NEVER DO THIS
const DATABASE_URL = "postgresql://user:password@host/db"; // NEVER DO THIS
```

✅ **CORRECT:**
```typescript
const STACKS_PRIVATE_KEY = process.env.STACKS_PRIVATE_KEY;
const API_KEY = process.env.API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!STACKS_PRIVATE_KEY) {
  throw new Error("STACKS_PRIVATE_KEY environment variable is required");
}
```

### Environment Variable Management

1. **Create a `.env.example` file** (safe to commit) with placeholder values:
```bash
# .env.example - Safe template (no real values)
STACKS_PRIVATE_KEY=your_private_key_here
STACKS_NETWORK=testnet
API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

2. **Create your local `.env` file** (automatically ignored):
```bash
# .env - Real values (NEVER COMMIT)
STACKS_PRIVATE_KEY=a1b2c3d4e5f6...actual_key_here
STACKS_NETWORK=testnet
API_KEY=sk_live_abc123...actual_key_here
DATABASE_URL=postgresql://realuser:realpass@host/realdb
```

3. **Load environment variables in your application:**
```typescript
import dotenv from 'dotenv';
dotenv.config();
```

### Before Every Commit

1. **Review staged changes**: `git diff --staged`
2. **Verify no secrets are included**: Search for patterns like `private`, `secret`, `key`, `token`, `password`
3. **Check `.env` files are not staged**: Ensure no `.env*` files appear in `git status`
4. **Never use `git add .` blindly**: Explicitly stage only files you've reviewed

### CI/CD Secret Management

- **Use GitHub Secrets** for GitHub Actions workflows
- **Use environment-specific secret management** (AWS Secrets Manager, HashiCorp Vault, etc.)
- **Never echo or print secrets in CI logs**
- **Rotate secrets immediately** if accidentally exposed in CI logs

### If You Accidentally Commit a Secret

1. **STOP IMMEDIATELY** - Do not push to remote if you haven't already
2. **Rotate the compromised secret** at its source (API provider, wallet, etc.)
3. **Remove the secret from git history**:
   - Use `git reset` if not pushed
   - Use `git filter-branch` or BFG Repo-Cleaner if pushed
4. **Report to the security team** if the repository is shared
5. **Audit all systems** that may have been compromised

### Secret Scanning

This repository should be configured with:
- **GitHub Secret Scanning** (for public/private repos)
- **Pre-commit hooks** to detect secrets before commit
- **Automated scanning tools** (Gitleaks, TruffleHog, detect-secrets)

## Testing & Development

### Local Testing with Secrets

- Use `.env.test` or `.env.development` for test environment secrets (both ignored)
- Never use production secrets in test environments
- Use mock/dummy keys for unit tests when possible
- For integration tests requiring real keys, load from environment variables

### Clarinet Development

When developing Stacks smart contracts with Clarinet:

1. **Never commit `settings/` directory** - Contains account configurations with private keys
2. **Use Clarinet's default test accounts** for local development
3. **For testnet/mainnet**, inject deployer keys via environment variables:
```bash
export STACKS_PRIVATE_KEY=your_testnet_key
clarinet deployments apply --network testnet
```

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project:

1. **DO NOT** open a public GitHub issue
2. **DO NOT** disclose the vulnerability publicly
3. **Email the security team** at [your-security-email@example.com]
4. **Include details**: Description, reproduction steps, potential impact
5. **Wait for response** before disclosure

We will respond to security reports within 48 hours and work with you to address the issue.

## Security Checklist for Contributors

Before submitting a pull request:

- [ ] No private keys, mnemonics, or seed phrases in any file
- [ ] No API keys, tokens, or credentials hard-coded
- [ ] All secrets loaded from environment variables
- [ ] `.env.example` updated with new required variables (no real values)
- [ ] No secrets in commit messages or PR descriptions
- [ ] No secrets in code comments
- [ ] Reviewed all file changes in `git diff` before commit
- [ ] Verified `.env` files are not staged in `git status`
- [ ] No database credentials or connection strings committed
- [ ] No Stacks wallet configuration files committed

## Additional Resources

- [Stacks Documentation - Key Management](https://docs.stacks.co/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning Documentation](https://docs.github.com/en/code-security/secret-scanning)
- [Clarinet Documentation - Network Configuration](https://docs.hiro.so/clarinet/)

---

**Remember: Security is everyone's responsibility. When in doubt, ask before committing.**
