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
(define-constant err-invalid-fee-amount (err u2417))

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

(define-private (assert-strategy-executor (strategy-id uint))
  (match (contract-call? .strategy-registry get-strategy-by-id strategy-id)
    strategy-entry
      (if (or (is-eq tx-sender (get authorized-executor strategy-entry)) (is-protocol-owner tx-sender))
        (ok true)
        err-owner-only
      )
    err-invalid-strategy
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
      (try! (contract-call? .vault-receipt-token mint vault-id tx-sender initial-deposit))
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

(define-public (deposit (vault-id uint) (asset-contract principal) (amount uint))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (match (map-get? vaults { vault-id: vault-id })
      vault-entry
        (begin
          (try! (assert-vault-owner (get vault-owner vault-entry)))
          (asserts! (is-eq (get vault-status vault-entry) vault-status-active) err-vault-not-active)
          (asserts! (not (get execution-locked vault-entry)) err-vault-locked)
          (asserts! (is-eq asset-contract (get asset-contract vault-entry)) err-asset-mismatch)
          (let ((protocol-asset (unwrap! (contract-call? .protocol-config get-supported-asset asset-contract) err-asset-not-supported)))
            (begin
              (asserts! (get active protocol-asset) err-asset-inactive)
              (asserts! (<= (+ (get total-assets vault-entry) amount) (get max-deposit-microstx protocol-asset)) err-deposit-above-asset-max)
              true
            )
          )
          (let ((updated-assets (+ (get total-assets vault-entry) amount)))
            (begin
              (try! (contract-call? .vault-receipt-token mint vault-id tx-sender amount))
              (map-set vaults
                { vault-id: vault-id }
                {
                  vault-owner: (get vault-owner vault-entry),
                  asset-contract: (get asset-contract vault-entry),
                  total-assets: updated-assets,
                  strategy-id: (get strategy-id vault-entry),
                  created-at-block: (get created-at-block vault-entry),
                  last-execution-block: (get last-execution-block vault-entry),
                  vault-status: (get vault-status vault-entry),
                  cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
                  execution-locked: (get execution-locked vault-entry)
                }
              )
              (print {
                event: "vault-deposit",
                vault-id: vault-id,
                depositor: tx-sender,
                asset-contract: asset-contract,
                amount: amount,
                total-assets: updated-assets
              })
              (ok updated-assets)
            )
          )
        )
      err-vault-not-found
    )
  )
)

(define-public (withdraw (vault-id uint) (amount uint))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (match (map-get? vaults { vault-id: vault-id })
      vault-entry
        (begin
          (try! (assert-vault-owner (get vault-owner vault-entry)))
          (asserts! (not (is-eq (get vault-status vault-entry) vault-status-closed)) err-vault-closed)
          (asserts! (not (get execution-locked vault-entry)) err-vault-locked)
          (asserts! (>= (get total-assets vault-entry) amount) err-insufficient-balance)
          (let ((updated-assets (- (get total-assets vault-entry) amount)))
            (begin
              (map-set vaults
                { vault-id: vault-id }
                {
                  vault-owner: (get vault-owner vault-entry),
                  asset-contract: (get asset-contract vault-entry),
                  total-assets: updated-assets,
                  strategy-id: (get strategy-id vault-entry),
                  created-at-block: (get created-at-block vault-entry),
                  last-execution-block: (get last-execution-block vault-entry),
                  vault-status: (get vault-status vault-entry),
                  cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
                  execution-locked: (get execution-locked vault-entry)
                }
              )
              (print {
                event: "vault-withdrawal",
                vault-id: vault-id,
                withdrawer: tx-sender,
                amount: amount,
                total-assets: updated-assets,
                full-withdrawal: (is-eq updated-assets u0)
              })
              (ok amount)
            )
          )
        )
      err-vault-not-found
    )
  )
)

(define-public (pause-vault (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry
      (begin
        (try! (assert-vault-owner (get vault-owner vault-entry)))
        (asserts! (is-eq (get vault-status vault-entry) vault-status-active) err-vault-not-active)
        (map-set vaults
          { vault-id: vault-id }
          {
            vault-owner: (get vault-owner vault-entry),
            asset-contract: (get asset-contract vault-entry),
            total-assets: (get total-assets vault-entry),
            strategy-id: (get strategy-id vault-entry),
            created-at-block: (get created-at-block vault-entry),
            last-execution-block: (get last-execution-block vault-entry),
            vault-status: vault-status-paused,
            cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
            execution-locked: (get execution-locked vault-entry)
          }
        )
        (print {
          event: "vault-paused",
          vault-id: vault-id,
          caller: tx-sender
        })
        (ok true)
      )
    err-vault-not-found
  )
)

(define-public (unpause-vault (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry
      (begin
        (try! (assert-vault-owner (get vault-owner vault-entry)))
        (asserts! (is-eq (get vault-status vault-entry) vault-status-paused) err-vault-not-paused)
        (map-set vaults
          { vault-id: vault-id }
          {
            vault-owner: (get vault-owner vault-entry),
            asset-contract: (get asset-contract vault-entry),
            total-assets: (get total-assets vault-entry),
            strategy-id: (get strategy-id vault-entry),
            created-at-block: (get created-at-block vault-entry),
            last-execution-block: (get last-execution-block vault-entry),
            vault-status: vault-status-active,
            cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
            execution-locked: (get execution-locked vault-entry)
          }
        )
        (print {
          event: "vault-unpaused",
          vault-id: vault-id,
          caller: tx-sender
        })
        (ok true)
      )
    err-vault-not-found
  )
)

(define-public (close-vault (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry
      (begin
        (try! (assert-vault-owner (get vault-owner vault-entry)))
        (asserts! (not (is-eq (get vault-status vault-entry) vault-status-closed)) err-vault-closed)
        (asserts! (not (get execution-locked vault-entry)) err-vault-locked)
        (asserts! (is-eq (get total-assets vault-entry) u0) err-vault-not-empty)
        (map-set vaults
          { vault-id: vault-id }
          {
            vault-owner: (get vault-owner vault-entry),
            asset-contract: (get asset-contract vault-entry),
            total-assets: (get total-assets vault-entry),
            strategy-id: (get strategy-id vault-entry),
            created-at-block: (get created-at-block vault-entry),
            last-execution-block: (get last-execution-block vault-entry),
            vault-status: vault-status-closed,
            cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
            execution-locked: false
          }
        )
        (print {
          event: "vault-closed",
          vault-id: vault-id,
          caller: tx-sender
        })
        (ok true)
      )
    err-vault-not-found
  )
)

(define-public (emergency-withdraw (vault-id uint))
  (begin
    (try! (assert-protocol-owner))
    (match (map-get? vaults { vault-id: vault-id })
      vault-entry
        (let ((withdrawn-amount (get total-assets vault-entry)))
          (begin
            (map-set vaults
              { vault-id: vault-id }
              {
                vault-owner: (get vault-owner vault-entry),
                asset-contract: (get asset-contract vault-entry),
                total-assets: u0,
                strategy-id: (get strategy-id vault-entry),
                created-at-block: (get created-at-block vault-entry),
                last-execution-block: (get last-execution-block vault-entry),
                vault-status: (if (is-eq (get vault-status vault-entry) vault-status-closed) vault-status-closed vault-status-paused),
                cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
                execution-locked: false
              }
            )
            (print {
              event: "vault-emergency-withdrawal",
              vault-id: vault-id,
              vault-owner: (get vault-owner vault-entry),
              asset-contract: (get asset-contract vault-entry),
              withdrawn-amount: withdrawn-amount,
              caller: tx-sender
            })
            (ok withdrawn-amount)
          )
        )
      err-vault-not-found
    )
  )
)

(define-public (lock-vault-for-execution (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry
      (begin
        (asserts! (is-eq (get vault-status vault-entry) vault-status-active) err-vault-not-active)
        (asserts! (not (get execution-locked vault-entry)) err-vault-locked)
        (try! (assert-strategy-active (get strategy-id vault-entry)))
        (try! (assert-strategy-executor (get strategy-id vault-entry)))
        (map-set vaults
          { vault-id: vault-id }
          {
            vault-owner: (get vault-owner vault-entry),
            asset-contract: (get asset-contract vault-entry),
            total-assets: (get total-assets vault-entry),
            strategy-id: (get strategy-id vault-entry),
            created-at-block: (get created-at-block vault-entry),
            last-execution-block: block-height,
            vault-status: (get vault-status vault-entry),
            cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
            execution-locked: true
          }
        )
        (print {
          event: "vault-execution-locked",
          vault-id: vault-id,
          strategy-id: (get strategy-id vault-entry),
          caller: tx-sender,
          locked-at-block: block-height
        })
        (ok true)
      )
    err-vault-not-found
  )
)

(define-public (unlock-vault-after-execution (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry
      (begin
        (asserts! (get execution-locked vault-entry) err-vault-not-active)
        (try! (assert-strategy-executor (get strategy-id vault-entry)))
        (map-set vaults
          { vault-id: vault-id }
          {
            vault-owner: (get vault-owner vault-entry),
            asset-contract: (get asset-contract vault-entry),
            total-assets: (get total-assets vault-entry),
            strategy-id: (get strategy-id vault-entry),
            created-at-block: (get created-at-block vault-entry),
            last-execution-block: block-height,
            vault-status: (get vault-status vault-entry),
            cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
            execution-locked: false
          }
        )
        (print {
          event: "vault-execution-unlocked",
          vault-id: vault-id,
          strategy-id: (get strategy-id vault-entry),
          caller: tx-sender,
          unlocked-at-block: block-height
        })
        (ok true)
      )
    err-vault-not-found
  )
)

(define-public (execute-approved-strategy (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry
      (begin
        (asserts! (is-eq (get vault-status vault-entry) vault-status-active) err-vault-not-active)
        (asserts! (not (get execution-locked vault-entry)) err-vault-locked)
        (try! (assert-strategy-active (get strategy-id vault-entry)))
        (try! (assert-strategy-executor (get strategy-id vault-entry)))
        (map-set vaults
          { vault-id: vault-id }
          {
            vault-owner: (get vault-owner vault-entry),
            asset-contract: (get asset-contract vault-entry),
            total-assets: (get total-assets vault-entry),
            strategy-id: (get strategy-id vault-entry),
            created-at-block: (get created-at-block vault-entry),
            last-execution-block: block-height,
            vault-status: (get vault-status vault-entry),
            cumulative-fees-paid: (get cumulative-fees-paid vault-entry),
            execution-locked: false
          }
        )
        (print {
          event: "vault-strategy-executed",
          vault-id: vault-id,
          strategy-id: (get strategy-id vault-entry),
          caller: tx-sender,
          execution-block: block-height
        })
        (ok true)
      )
    err-vault-not-found
  )
)

(define-public (apply-performance-fee (vault-id uint) (fee-amount uint))
  (begin
    (try! (assert-protocol-owner))
    (asserts! (> fee-amount u0) err-invalid-fee-amount)
    (match (map-get? vaults { vault-id: vault-id })
      vault-entry
        (begin
          (asserts! (not (is-eq (get vault-status vault-entry) vault-status-closed)) err-vault-closed)
          (asserts! (>= (get total-assets vault-entry) fee-amount) err-insufficient-balance)
          (let
            (
              (updated-assets (- (get total-assets vault-entry) fee-amount))
              (updated-fees (+ (get cumulative-fees-paid vault-entry) fee-amount))
            )
            (begin
              (map-set vaults
                { vault-id: vault-id }
                {
                  vault-owner: (get vault-owner vault-entry),
                  asset-contract: (get asset-contract vault-entry),
                  total-assets: updated-assets,
                  strategy-id: (get strategy-id vault-entry),
                  created-at-block: (get created-at-block vault-entry),
                  last-execution-block: (get last-execution-block vault-entry),
                  vault-status: (get vault-status vault-entry),
                  cumulative-fees-paid: updated-fees,
                  execution-locked: (get execution-locked vault-entry)
                }
              )
              (print {
                event: "vault-performance-fee-applied",
                vault-id: vault-id,
                fee-amount: fee-amount,
                cumulative-fees-paid: updated-fees,
                remaining-assets: updated-assets,
                caller: tx-sender
              })
              (ok updated-assets)
            )
          )
        )
      err-vault-not-found
    )
  )
)

(define-read-only (get-next-vault-id)
  (var-get next-vault-id)
)

(define-read-only (get-vault (vault-id uint))
  (map-get? vaults { vault-id: vault-id })
)

(define-read-only (get-vault-status (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry (ok (get vault-status vault-entry))
    err-vault-not-found
  )
)

(define-read-only (get-vault-total-assets (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry (ok (get total-assets vault-entry))
    err-vault-not-found
  )
)

(define-read-only (is-vault-locked (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault-entry (ok (get execution-locked vault-entry))
    err-vault-not-found
  )
)
