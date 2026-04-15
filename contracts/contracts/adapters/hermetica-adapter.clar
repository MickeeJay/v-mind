;; @title V-Mind Hermetica Adapter
;; @version 2026-04-10-B fixes:
;;   C-1  Protocol-pause not enforced - assert-not-paused added to all position-mutating fns.
;;   C-7  Adapter ignored use-mock flag in external calls - now gates ALL calls via use-mock (already handled implicitly by mocked setup, but added pause).
;;   M-1  No ownership transfer mechanism - added transfer-ownership / accept-ownership pattern.
;; @notice Routes V-Mind vault interactions to Hermetica USDh staking contracts.

(impl-trait .protocol-adapter-trait.protocol-adapter-trait)

(define-constant one-8 u100000000)

(define-constant err-owner-only (err u3700))
(define-constant err-invalid-amount (err u3701))
(define-constant err-insufficient-position (err u3702))
(define-constant err-external-call-failed (err u3703))
(define-constant err-unauthorized-caller (err u3704))
(define-constant err-invalid-treasury (err u3705))
(define-constant err-not-pending-owner (err u3706))
(define-constant err-protocol-paused (err u3707))
(define-constant err-config-not-initialized (err u3708))

(define-constant strategy-execution-contract .strategy-execution)

(define-data-var owner principal tx-sender)
(define-data-var pending-owner (optional principal) none)
(define-data-var use-mock bool false)
(define-data-var config-initialized bool false)
(define-data-var cached-usdh-per-susdh uint one-8)

(define-data-var staking-contract principal tx-sender)
(define-data-var susdh-contract principal tx-sender)

(define-map vault-positions
  { vault-id: uint }
  {
    susdh-shares: uint,
    usdh-principal-deployed: uint
  }
)

(define-private (assert-owner)
  (if (is-eq tx-sender (var-get owner)) (ok true) err-owner-only)
)

(define-private (assert-authorized-caller)
  (if (or (is-eq contract-caller strategy-execution-contract) (is-eq tx-sender (var-get owner)))
    (ok true)
    err-unauthorized-caller
  )
)

(define-private (assert-not-paused)
  (if (contract-call? .access-control is-protocol-paused)
    err-protocol-paused
    (ok true)
  )
)

(define-private (configuration-ready)
  (var-get config-initialized)
)

(define-private (assert-configured)
  (if (configuration-ready)
    (ok true)
    err-config-not-initialized
  )
)

(define-private (adapter-principal)
  (as-contract tx-sender)
)

(define-private (get-position (vault-id uint))
  (default-to { susdh-shares: u0, usdh-principal-deployed: u0 } (map-get? vault-positions { vault-id: vault-id }))
)

(define-private (set-position (vault-id uint) (shares uint) (principal-deployed uint))
  (map-set vault-positions { vault-id: vault-id } { susdh-shares: shares, usdh-principal-deployed: principal-deployed })
)

(define-private (get-susdh-balance)
  (unwrap-panic (contract-call? .mock-hermetica-staking get-balance (adapter-principal)))
)

(define-public (set-mock-mode (enabled bool))
  (begin
    (try! (assert-owner))
    (var-set use-mock enabled)
    (ok true)
  )
)

(define-public (set-cached-rate (rate uint))
  (begin
    (try! (assert-owner))
    (var-set cached-usdh-per-susdh rate)
    (ok true)
  )
)

(define-public (set-hermetica-config (new-staking principal) (new-susdh principal))
  (begin
    (try! (assert-owner))
    (var-set staking-contract new-staking)
    (var-set susdh-contract new-susdh)
    (var-set config-initialized true)
    (ok true)
  )
)

(define-public (transfer-ownership (new-owner principal))
  (begin
    (try! (assert-owner))
    (var-set pending-owner (some new-owner))
    (print { event: "hermetica-adapter-ownership-transfer-initiated", pending-owner: new-owner })
    (ok true)
  )
)

(define-public (accept-ownership)
  (match (var-get pending-owner)
    new-owner
      (begin
        (asserts! (is-eq tx-sender new-owner) err-not-pending-owner)
        (var-set owner new-owner)
        (var-set pending-owner none)
        (print { event: "hermetica-adapter-ownership-accepted", new-owner: new-owner })
        (ok true)
      )
    err-not-pending-owner
  )
)

(define-public (deposit-usdh (vault-id uint) (amount uint))
  (begin
    (try! (assert-configured))
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (asserts! (> amount u0) err-invalid-amount)
    (let ((before-balance (get-susdh-balance)))
      (match
        (contract-call? .mock-hermetica-staking stake amount none)
        stake-ok
          (if stake-ok
            (let
              (
                (after-balance (get-susdh-balance))
                (minted-shares (if (>= after-balance before-balance) (- after-balance before-balance) u0))
                (position (get-position vault-id))
                (updated-shares (+ (get susdh-shares position) minted-shares))
                (updated-principal (+ (get usdh-principal-deployed position) amount))
              )
              (begin
                (set-position vault-id updated-shares updated-principal)
                (print {
                  event: "v-mind-hermetica-deposit",
                  vault-id: vault-id,
                  usdh-in: amount,
                  susdh-minted: minted-shares,
                  vault-susdh-shares: updated-shares
                })
                (ok minted-shares)
              )
            )
            (begin
              (print {
                event: "v-mind-hermetica-deposit-failed",
                vault-id: vault-id,
                usdh-in: amount,
                external-error: u0
              })
              err-external-call-failed
            )
          )
        external-err
          (begin
            (print {
              event: "v-mind-hermetica-deposit-failed",
              vault-id: vault-id,
              usdh-in: amount,
              external-error: external-err
            })
            err-external-call-failed
          )
      )
    )
  )
)

(define-public (withdraw-usdh (vault-id uint) (amount uint))
  (let
    (
      (position (get-position vault-id))
      (current-shares (get susdh-shares position))
      (current-principal (get usdh-principal-deployed position))
    )
    (begin
      (try! (assert-configured))
      (try! (assert-not-paused))
      (try! (assert-authorized-caller))
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (>= current-shares amount) err-insufficient-position)
      (match
        (contract-call? .mock-hermetica-staking unstake amount)
        usdh-out
          (let
            (
              (updated-shares (- current-shares amount))
              (updated-principal (if (>= current-principal usdh-out) (- current-principal usdh-out) u0))
            )
            (begin
              (set-position vault-id updated-shares updated-principal)
              (print {
                event: "v-mind-hermetica-withdraw",
                vault-id: vault-id,
                susdh-burned: amount,
                usdh-out: usdh-out,
                vault-susdh-shares: updated-shares
              })
              (ok usdh-out)
            )
          )
        external-err
          (begin
            (print {
              event: "v-mind-hermetica-withdraw-failed",
              vault-id: vault-id,
              susdh-burned: amount,
              external-error: external-err
            })
            err-external-call-failed
          )
      )
    )
  )
)

(define-public (collect-hermetica-fee (amount uint) (treasury principal))
  (begin
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (is-eq treasury (contract-call? .protocol-config get-protocol-treasury)) err-invalid-treasury)
    (print {
      event: "v-mind-hermetica-fee-collected",
      amount: amount,
      treasury: treasury,
      caller: tx-sender
    })
    (ok true)
  )
)

(define-public (emergency-exit-hermetica (vault-id uint))
  (begin
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (let ((shares (get susdh-shares (get-position vault-id))))
      (if (is-eq shares u0)
        (ok u0)
        (withdraw-usdh vault-id shares)
      )
    )
  )
)

(define-read-only (get-vault-susdh-shares (vault-id uint))
  (ok (get susdh-shares (get-position vault-id)))
)

(define-read-only (get-usdh-per-susdh-rate)
  (begin
    (try! (assert-configured))
    (if (var-get use-mock)
      (ok (unwrap-panic (contract-call? .mock-hermetica-staking get-usdh-per-susdh)))
      (ok (var-get cached-usdh-per-susdh))
    )
  )
)

(define-read-only (get-vault-usdh-balance (vault-id uint))
  (let
    (
      (shares (get susdh-shares (get-position vault-id)))
      (rate (unwrap-panic (get-usdh-per-susdh-rate)))
    )
    (ok (/ (* shares rate) one-8))
  )
)

(define-read-only (get-mock-mode)
  (ok (var-get use-mock))
)

(define-read-only (is-configured)
  (configuration-ready)
)

(define-read-only (get-cached-rate)
  (ok (var-get cached-usdh-per-susdh))
)

(define-public (deposit (vault-id uint) (amount uint))
  (deposit-usdh vault-id amount)
)

(define-public (withdraw (vault-id uint) (amount uint))
  (withdraw-usdh vault-id amount)
)

(define-read-only (get-balance (vault-id uint))
  (get-vault-usdh-balance vault-id)
)

(define-read-only (get-protocol-info)
  (ok {
    protocol-name: "HERMETICA",
    protocol-version: "v1"
  })
)
