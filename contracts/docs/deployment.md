# V-Mind Deployment Runbook

## Purpose

This runbook defines a scripted, reproducible deployment flow for V-Mind contracts from local development through Stacks testnet and Stacks mainnet. All deployment and initialization actions are performed through versioned scripts and network configuration files.

## Pre-deployment checklist

1. Verify the branch includes the exact contract versions intended for release.
2. Confirm `.env` is populated with `STACKS_NETWORK`, `STACKS_NODE_URL`, `DEPLOYER_ADDRESS`, and `DEPLOYER_PRIVATE_KEY`.
3. Confirm the selected deployment config file under `contracts/deployments/config` matches the target network.
4. Run static checks before any live deployment:
   - `npm run check --workspace=contracts`
   - `npm run deploy:type-check --workspace=contracts`
5. Confirm deployer wallet has sufficient STX for all contract deployments and initialization transactions.
6. Confirm protocol treasury and role addresses in the selected config are reviewed by governance/security owners.

## Deployment commands

Run all commands from the repository root.

### 1) Install dependencies

```bash
npm install
```

### 2) Set network target and config path

```bash
set STACKS_NETWORK=testnet
set STACKS_NODE_URL=https://api.testnet.hiro.so
set DEPLOY_CONFIG_PATH=contracts/deployments/config/testnet.json
```

For mainnet, switch values accordingly:

```bash
set STACKS_NETWORK=mainnet
set STACKS_NODE_URL=https://api.hiro.so
set DEPLOY_CONFIG_PATH=contracts/deployments/config/mainnet.json
```

### 3) Deploy contracts in order

```bash
npm run deploy:tooling --workspace=contracts
```

This script deploys contracts in the enforced order:

1. access-control
2. protocol-config
3. strategy-registry
4. vault-receipt-token
5. protocol adapters
6. strategy-vault
7. strategy-execution

The script waits for transaction confirmation before moving to the next contract and writes a deployment manifest to `contracts/deployments/manifests`.

### 4) Initialize protocol state

```bash
set DEPLOYMENT_MANIFEST_PATH=contracts/deployments/manifests/<manifest-file>.json
npm run deploy:init --workspace=contracts -- --manifest %DEPLOYMENT_MANIFEST_PATH%
```

## Post-deployment verification

Run verification against the same manifest used for initialization:

```bash
npm run deploy:verify --workspace=contracts -- --manifest %DEPLOYMENT_MANIFEST_PATH%
```

Verification checks include:

1. Every contract in the manifest exists on the target node at the expected address.
2. Access control owner state is correct.
3. Protocol configuration values match configured initialization parameters.
4. Strategy registry contains all configured initial strategies.
5. Vault receipt token initialization is complete and linked to the deployed vault core.
6. Strategy execution read-only values match protocol configuration.

If discrepancies are found, the script exits non-zero and prints each mismatch.
