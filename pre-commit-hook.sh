#!/usr/bin/env bash
# Enhanced pre-commit hook with environment variable security scanning
# Prevents committing secrets, private keys, and environment files

echo "🔍 Running pre-commit security checks..."

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Patterns to check for in staged files
FORBIDDEN_PATTERNS=(
    "private[-_]key"
    "privatekey"
    "PRIVATE[-_]KEY"
    "BEGIN PRIVATE KEY"
    "BEGIN RSA PRIVATE KEY"
    "BEGIN ENCRYPTED PRIVATE KEY"
    "secret[-_]key"
    "SECRET[-_]KEY"
    "api[-_]key"
    "API[-_]KEY"
    "password\s*=\s*['\"]"
    "PASSWORD\s*=\s*['\"]"
    "token\s*=\s*['\"]"
    "TOKEN\s*=\s*['\"]"
    "mnemonic"
    "seed[-_]phrase"
    "STACKS_PRIVATE_KEY\s*=\s*['\"][a-f0-9]"
)

# Files that should never be committed
FORBIDDEN_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    ".env.development"
    "agent/.env"
    "web/.env"
    "web/.env.local"
    "contracts/.env"
    ".npmrc"
    "id_rsa"
    "id_dsa"
    "id_ecdsa"
    "*.pem"
    "*.key"
    "*.p12"
    "*.pfx"
)

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "No files staged for commit"
    exit 0
fi

VIOLATIONS=0

# Check for forbidden file names
echo "Checking for forbidden file patterns..."
for pattern in "${FORBIDDEN_FILES[@]}"; do
    matches=$(echo "$STAGED_FILES" | grep -E "$pattern" || true)
    if [ ! -z "$matches" ]; then
        echo -e "${RED}❌ ERROR: Attempting to commit forbidden file(s):${NC}"
        echo "$matches" | while read file; do
            echo -e "  ${RED}$file${NC}"
        done
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

# Check for 64-character hex strings (potential private keys)
echo "Checking for private key patterns..."
for file in $STAGED_FILES; do
    if file "$file" | grep -q "text"; then
        # Check for 64 hex character sequences (private keys)
        matches=$(git diff --cached "$file" | grep -E "[a-fA-F0-9]{64}" || true)
        if [ ! -z "$matches" ]; then
            echo -e "${RED}❌ ERROR: Potential private key in $file:${NC}"
            echo -e "  Found 64-character hex sequence (possible private key)"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi
done

# Check for mnemonic phrases (12 or 24 word sequences)
echo "Checking for mnemonic phrases..."
for file in $STAGED_FILES; do
    if file "$file" | grep -q "text"; then
        # Simple check: lines with 12 or 24 space-separated words
        matches=$(git diff --cached "$file" | grep -E "^\+.*(\b\w+\b\s+){11}\b\w+\b" || true)
        if [ ! -z "$matches" ]; then
            echo -e "${YELLOW}⚠️  WARNING: Potential mnemonic phrase in $file${NC}"
            echo -e "  Found sequence of 12+ words (possible seed phrase)"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi
done

# Check for forbidden patterns in file contents
echo "Checking for secret patterns in file contents..."
for file in $STAGED_FILES; do
    # Skip binary files and certain file types
    if file "$file" | grep -q "text"; then
        for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
            matches=$(git diff --cached "$file" | grep -E "$pattern" || true)
            if [ ! -z "$matches" ]; then
                echo -e "${RED}❌ ERROR: Found potential secret in $file:${NC}"
                echo -e "  Pattern: ${YELLOW}$pattern${NC}"
                VIOLATIONS=$((VIOLATIONS + 1))
            fi
        done
    fi
done

# Check for hardcoded credentials in common formats
echo "Checking for hardcoded credentials..."
for file in $STAGED_FILES; do
    if file "$file" | grep -q "text"; then
        # Check for hardcoded URLs with credentials
        matches=$(git diff --cached "$file" | grep -E "(https?://[^:]+:[^@]+@|postgres://[^:]+:[^@]+@|mysql://[^:]+:[^@]+@)" || true)
        if [ ! -z "$matches" ]; then
            echo -e "${RED}❌ ERROR: Found hardcoded credentials in URL in $file${NC}"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
        
        # Check for AWS keys
        matches=$(git diff --cached "$file" | grep -E "(AKIA[0-9A-Z]{16}|aws_access_key_id\s*=)" || true)
        if [ ! -z "$matches" ]; then
            echo -e "${RED}❌ ERROR: Found potential AWS credentials in $file${NC}"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
        
        # Check for API key patterns (sk-*, pk-*, etc.)
        matches=$(git diff --cached "$file" | grep -E "(sk-[a-zA-Z0-9]{20,}|pk-[a-zA-Z0-9]{20,})" || true)
        if [ ! -z "$matches" ]; then
            echo -e "${RED}❌ ERROR: Found potential API key in $file${NC}"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi
done

# Check that .env.example files don't contain real secrets
echo "Checking .env.example files..."
for file in $STAGED_FILES; do
    if [[ "$file" == *.env.example ]]; then
        # Check for patterns that look like real values
        if git diff --cached "$file" | grep -qE "(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|[a-fA-F0-9]{64})"; then
            echo -e "${RED}❌ ERROR: .env.example file contains real secrets: $file${NC}"
            echo -e "  .env.example files should only contain placeholders"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi
done

# Results
echo ""
if [ $VIOLATIONS -eq 0 ]; then
    echo -e "${GREEN}✅ Pre-commit checks passed!${NC}"
    echo -e "${GREEN}No sensitive data detected in staged files.${NC}"
    exit 0
else
    echo -e "${RED}❌ Pre-commit checks FAILED!${NC}"
    echo -e "${RED}Found $VIOLATIONS potential security issue(s).${NC}"
    echo ""
    echo -e "${YELLOW}Please review your changes and ensure no secrets are committed.${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "  • .env files (use .env.example instead)"
    echo -e "  • Private keys or mnemonics"
    echo -e "  • API keys in code"
    echo -e "  • Database URLs with credentials"
    echo ""
    echo -e "${YELLOW}If you're certain these are not secrets, you can bypass with:${NC}"
    echo -e "${YELLOW}  git commit --no-verify${NC}"
    echo ""
    echo -e "${RED}However, bypassing this check is strongly discouraged!${NC}"
    exit 1
fi
