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
