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

(define-private (assert-protocol-owner)
  (if (is-protocol-owner tx-sender)
    (ok true)
    err-protocol-owner-only
  )
)

(define-private (assert-vault-owner (owner principal))
  (if (is-eq tx-sender owner)
    (ok true)
    err-owner-only
  )
)

(define-private (assert-strategy-active (strategy-id uint))
  (match (contract-call? .strategy-registry get-strategy-by-id strategy-id)
    strategy-entry
      (if (contract-call? .strategy-registry is-strategy-active strategy-id)
        (ok true)
        err-strategy-inactive
      )
    err-invalid-strategy
  )
)

(define-private (assert-supported-asset-and-amount (asset-contract principal) (amount uint))
  (match (contract-call? .protocol-config get-supported-asset asset-contract)
    asset-entry
      (begin
        (asserts! (get active asset-entry) err-asset-inactive)
        (asserts! (>= amount (contract-call? .protocol-config get-minimum-deposit-microstx)) err-deposit-below-minimum)
        (asserts! (>= amount (get min-deposit-microstx asset-entry)) err-deposit-below-minimum)
        (asserts! (<= amount (get max-deposit-microstx asset-entry)) err-deposit-above-asset-max)
        (ok true)
      )
    err-asset-not-supported
  )
)

(define-public (create-vault (asset-contract principal) (initial-deposit uint) (strategy-id uint))
  (let
    (
      (vault-id (var-get next-vault-id))
      (created-at block-height)
    )
    (begin
      (asserts! (> initial-deposit u0) err-invalid-amount)
      (try! (assert-supported-asset-and-amount asset-contract initial-deposit))
      (try! (assert-strategy-active strategy-id))
      (map-set vaults
        { vault-id: vault-id }
        {
          vault-owner: tx-sender,
          asset-contract: asset-contract,
          total-assets: initial-deposit,
          strategy-id: strategy-id,
          created-at-block: created-at,
          last-execution-block: created-at,
          vault-status: vault-status-active,
          cumulative-fees-paid: u0,
          execution-locked: false
        }
      )
      (var-set next-vault-id (+ vault-id u1))
      (print {
        event: "vault-created",
        vault-id: vault-id,
        vault-owner: tx-sender,
        asset-contract: asset-contract,
        initial-deposit: initial-deposit,
        strategy-id: strategy-id,
        created-at-block: created-at,
        vault-status: vault-status-active
      })
      (ok vault-id)
    )
  )
)
