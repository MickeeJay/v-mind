;; @title V-Mind ALEX Liquidity Adapter
;; @version 2026-04-10 reconciled adapter trait wrappers and principal configuration
;; @notice Routes V-Mind vault interactions to ALEX AMM interfaces.
;; @public-functions
;; - set-mock-mode / set-alex-config (owner-only): Adapter configuration.
;; - provide-alex-liquidity / withdraw-alex-liquidity / emergency-exit-alex (strategy-execution-or-owner): Position management.
;; - collect-alex-fee (strategy-execution-or-owner): Fee accounting hook restricted to protocol treasury.

(impl-trait .protocol-adapter-trait.protocol-adapter-trait)

(define-constant one-8 u100000000)
(define-constant max-uint u340282366920938463463374607431768211455)

(define-constant err-owner-only (err u3500))
(define-constant err-invalid-amount (err u3501))
(define-constant err-insufficient-position (err u3502))
(define-constant err-external-call-failed (err u3503))
(define-constant err-unauthorized-caller (err u3504))
(define-constant err-invalid-treasury (err u3505))
(define-constant err-not-pending-owner (err u3506))
(define-constant err-protocol-paused (err u3507))
(define-constant err-config-not-initialized (err u3508))

(define-constant strategy-execution-contract .strategy-execution)

(define-data-var owner principal tx-sender)
(define-data-var pending-owner (optional principal) none)
(define-data-var use-mock bool false)
(define-data-var config-initialized bool false)
(define-data-var token-x principal tx-sender)
(define-data-var token-y principal tx-sender)
(define-data-var pool-factor uint u1000)

(define-map vault-positions
  { vault-id: uint }
  {
    lp-balance: uint,
    token-x-deployed: uint
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

(define-private (is-contract-principal (target principal))
  (match (principal-destruct? target)
    principal-data (is-some (get name principal-data))
    principal-data (is-some (get name principal-data))
  )
)

(define-private (get-position (vault-id uint))
  (default-to { lp-balance: u0, token-x-deployed: u0 } (map-get? vault-positions { vault-id: vault-id }))
)

(define-private (set-position (vault-id uint) (lp-balance uint) (token-x-deployed uint))
  (map-set vault-positions { vault-id: vault-id } { lp-balance: lp-balance, token-x-deployed: token-x-deployed })
)

(define-private (call-add-position (amount uint))
  (begin
    (try! (assert-configured))
    (as-contract
      (contract-call? .mock-alex-amm add-to-position
        (var-get token-x)
        (var-get token-y)
        (var-get pool-factor)
        amount
        none
      )
    )
  )
)

(define-private (call-reduce-position (percent uint))
  (begin
    (try! (assert-configured))
    (as-contract
      (contract-call? .mock-alex-amm reduce-position
        (var-get token-x)
        (var-get token-y)
        (var-get pool-factor)
        percent
      )
    )
  )
)

(define-public (set-mock-mode (enabled bool))
  (begin
    (try! (assert-owner))
    (var-set use-mock enabled)
    (ok true)
  )
)

(define-public (set-alex-config (new-token-x principal) (new-token-y principal) (new-pool-factor uint))
  (begin
    (try! (assert-owner))
    (asserts! (is-contract-principal new-token-x) err-config-not-initialized)
    (asserts! (is-contract-principal new-token-y) err-config-not-initialized)
    (asserts! (> new-pool-factor u0) err-invalid-amount)
    (var-set token-x new-token-x)
    (var-set token-y new-token-y)
    (var-set pool-factor new-pool-factor)
    (var-set config-initialized true)
    (ok true)
  )
)

(define-public (transfer-ownership (new-owner principal))
  (begin
    (try! (assert-owner))
    (asserts! (is-standard new-owner) err-not-pending-owner)
    (var-set pending-owner (some new-owner))
    (print { event: "alex-adapter-ownership-transfer-initiated", pending-owner: new-owner })
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
        (print { event: "alex-adapter-ownership-accepted", new-owner: new-owner })
        (ok true)
      )
    err-not-pending-owner
  )
)

(define-public (provide-alex-liquidity (vault-id uint) (amount uint))
  (begin
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (try! (assert-configured))
    (asserts! (> vault-id u0) err-invalid-amount)
    (asserts! (> amount u0) err-invalid-amount)
    (match (call-add-position amount)
      add-result
        (let
          (
            (dx (get dx add-result))
            (dy (get dy add-result))
            (minted-lp (get supply add-result))
            (position (get-position vault-id))
            (current-lp (get lp-balance position))
            (current-token-x (get token-x-deployed position))
            (updated-lp (+ current-lp minted-lp))
            (updated-token-x (+ current-token-x dx))
          )
          (begin
            (asserts! (<= minted-lp (- max-uint current-lp)) err-invalid-amount)
            (asserts! (<= dx (- max-uint current-token-x)) err-invalid-amount)
            (set-position vault-id updated-lp updated-token-x)
            (print {
              event: "v-mind-alex-add-liquidity",
              vault-id: vault-id,
              amount-in: amount,
              token-x-used: dx,
              token-y-used: dy,
              lp-minted: minted-lp,
              lp-balance: updated-lp,
              mock-mode: (var-get use-mock)
            })
            (ok dx)
          )
        )
      external-err
        (begin
          (print {
            event: "v-mind-alex-add-liquidity-failed",
            vault-id: vault-id,
            amount-in: amount,
            external-error: external-err,
            normalized-error: err-external-call-failed
          })
          err-external-call-failed
        )
    )
  )
)

(define-public (withdraw-alex-liquidity (vault-id uint) (amount uint))
  (begin
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (try! (assert-configured))
    (asserts! (> vault-id u0) err-invalid-amount)
    (asserts! (> amount u0) err-invalid-amount)
    (let
      (
        (position (get-position vault-id))
        (current-lp (get lp-balance position))
        (current-token-x (get token-x-deployed position))
      )
      (begin
        (asserts! (>= current-lp amount) err-insufficient-position)
        (let ((percent (if (is-eq amount current-lp) one-8 (/ (* amount one-8) current-lp))))
          (match (call-reduce-position percent)
            withdraw-result
              (let
                (
                  (dx (get dx withdraw-result))
                  (dy (get dy withdraw-result))
                  (updated-lp (- current-lp amount))
                  (updated-token-x (if (>= current-token-x dx) (- current-token-x dx) u0))
                )
                (begin
                  (set-position vault-id updated-lp updated-token-x)
                  (print {
                    event: "v-mind-alex-withdraw-liquidity",
                    vault-id: vault-id,
                    lp-burned: amount,
                    token-x-out: dx,
                    token-y-out: dy,
                    lp-balance: updated-lp,
                    mock-mode: (var-get use-mock)
                  })
                  (ok dx)
                )
              )
            external-err
              (begin
                (print {
                  event: "v-mind-alex-withdraw-liquidity-failed",
                  vault-id: vault-id,
                  lp-burned: amount,
                  external-error: external-err,
                  normalized-error: err-external-call-failed
                })
                err-external-call-failed
              )
          )
        )
      )
    )
  )
)

(define-read-only (collect-alex-fee (amount uint) (treasury principal))
  (begin
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (is-eq treasury (contract-call? .protocol-config get-protocol-treasury)) err-invalid-treasury)
    (ok true)
  )
)

(define-public (emergency-exit-alex (vault-id uint))
  (begin
    (try! (assert-not-paused))
    (try! (assert-authorized-caller))
    (asserts! (> vault-id u0) err-invalid-amount)
    (let ((current-lp (get lp-balance (get-position vault-id))))
      (if (is-eq current-lp u0)
        (ok u0)
        (withdraw-alex-liquidity vault-id current-lp)
      )
    )
  )
)

(define-read-only (get-vault-alex-lp-balance (vault-id uint))
  (ok (get lp-balance (get-position vault-id)))
)

(define-read-only (get-vault-alex-token-x-balance (vault-id uint))
  (ok (get token-x-deployed (get-position vault-id)))
)

(define-read-only (get-mock-mode)
  (ok (var-get use-mock))
)

(define-read-only (is-configured)
  (configuration-ready)
)

(define-public (deposit (vault-id uint) (amount uint))
  (provide-alex-liquidity vault-id amount)
)

(define-public (withdraw (vault-id uint) (amount uint))
  (withdraw-alex-liquidity vault-id amount)
)

(define-read-only (get-balance (vault-id uint))
  (get-vault-alex-token-x-balance vault-id)
)

(define-read-only (get-protocol-info)
  (ok {
    protocol-name: "ALEX",
    protocol-version: "v1"
  })
)
