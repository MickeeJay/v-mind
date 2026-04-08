;; @title V-Mind Vault Core
;; @version 0.2.0
;; @author V-Mind Core Team
;; @notice Security-focused vault core handling creation, deposits, withdrawals, and emergency exits.
;; @dev This contract tracks vault state in a vault-id keyed map and validates protocol policy before state changes.
;; @contract strategy-vault

(define-constant role-owner u1)

(define-constant vault-status-active u1)
(define-constant vault-status-paused u2)
(define-constant vault-status-closed u3)

(define-constant err-vault-not-found (err u2400))
(define-constant err-owner-only (err u2401))
(define-constant err-protocol-owner-only (err u2402))
(define-constant err-invalid-amount (err u2403))
(define-constant err-asset-not-supported (err u2404))
(define-constant err-asset-inactive (err u2405))
(define-constant err-asset-mismatch (err u2406))
(define-constant err-deposit-below-minimum (err u2407))
(define-constant err-deposit-above-asset-max (err u2408))
(define-constant err-invalid-strategy (err u2409))
(define-constant err-strategy-inactive (err u2410))
(define-constant err-vault-not-active (err u2411))
(define-constant err-vault-locked (err u2412))
(define-constant err-insufficient-balance (err u2413))
(define-constant err-vault-not-paused (err u2414))
(define-constant err-vault-not-empty (err u2415))
(define-constant err-vault-closed (err u2416))

(define-data-var next-vault-id uint u1)

(define-map vaults
  { vault-id: uint }
  {
    vault-owner: principal,
    asset-contract: principal,
    total-assets: uint,
    strategy-id: uint,
    created-at-block: uint,
    last-execution-block: uint,
    vault-status: uint,
    cumulative-fees-paid: uint,
    execution-locked: bool
  }
)

(define-private (is-protocol-owner (caller principal))
  (or
    (contract-call? .access-control has-role caller role-owner)
    (is-eq caller (contract-call? .access-control get-owner))
  )
)
