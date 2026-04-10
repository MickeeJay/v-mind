;; @title V-Mind Zest Protocol Adapter
;; @version 2026-04-10 reconciled adapter trait wrappers and principal configuration
;; @notice Routes V-Mind vault interactions to Zest lending interfaces.
;; @public-functions
;; - set-mock-mode (owner-only): Toggle mock mode.
;; - deposit-to-zest / withdraw-from-zest / emergency-exit-zest (strategy-execution-or-owner): Position management.
;; - collect-zest-fee (strategy-execution-or-owner): Fee accounting hook restricted to protocol treasury.

(impl-trait .protocol-adapter-trait.protocol-adapter-trait)

(define-constant err-owner-only (err u3400))
(define-constant err-invalid-amount (err u3401))
(define-constant err-insufficient-position (err u3402))
(define-constant err-external-call-failed (err u3403))
(define-constant err-unauthorized-caller (err u3404))
(define-constant err-invalid-treasury (err u3405))

(define-constant strategy-execution-contract .strategy-execution)

(define-data-var owner principal tx-sender)
(define-data-var use-mock bool true)
(define-data-var total-deployed uint u0)
(define-data-var zest-pool-reserve principal tx-sender)
(define-data-var zest-ztoken principal tx-sender)
(define-data-var zest-asset principal tx-sender)
(define-data-var zest-oracle principal tx-sender)
(define-data-var zest-incentives principal tx-sender)

(define-map vault-positions
  { vault-id: uint }
  { deployed-amount: uint }
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

(define-private (adapter-principal)
  (as-contract tx-sender)
)

(define-private (get-vault-position (vault-id uint))
  (default-to u0 (get deployed-amount (map-get? vault-positions { vault-id: vault-id })))
)

(define-private (set-vault-position (vault-id uint) (amount uint))
  (map-set vault-positions { vault-id: vault-id } { deployed-amount: amount })
)

(define-private (call-supply (amount uint))
  (contract-call? .mock-zest-protocol supply
    (var-get zest-ztoken)
    (var-get zest-pool-reserve)
    (var-get zest-asset)
    amount
    (adapter-principal)
    none
    (var-get zest-incentives)
  )
)

(define-private (call-withdraw (amount uint))
  (contract-call? .mock-zest-protocol withdraw
    (var-get zest-ztoken)
    (var-get zest-pool-reserve)
    (var-get zest-asset)
    (var-get zest-oracle)
    amount
    (adapter-principal)
    (list { asset: (var-get zest-asset), lp-token: (var-get zest-ztoken), oracle: (var-get zest-oracle) })
    (var-get zest-incentives)
    none
  )
)

(define-public (set-mock-mode (enabled bool))
  (begin
    (try! (assert-owner))
    (var-set use-mock enabled)
    (ok true)
  )
)

(define-public (deposit-to-zest (vault-id uint) (amount uint))
  (begin
    (try! (assert-authorized-caller))
    (asserts! (> amount u0) err-invalid-amount)
    (match (call-supply amount)
      supply-result
        (if supply-result
          (let ((updated (+ (get-vault-position vault-id) amount)))
            (begin
              (set-vault-position vault-id updated)
              (var-set total-deployed (+ (var-get total-deployed) amount))
              (print {
                event: "v-mind-zest-deposit",
                vault-id: vault-id,
                amount: amount,
                updated-position: updated,
                mock-mode: (var-get use-mock)
              })
              (ok amount)
            )
          )
          err-external-call-failed
        )
      external-err
        (begin
          (print {
            event: "v-mind-zest-deposit-failed",
            vault-id: vault-id,
            amount: amount,
            external-error: external-err,
            normalized-error: err-external-call-failed
          })
          err-external-call-failed
        )
    )
  )
)

(define-public (withdraw-from-zest (vault-id uint) (amount uint))
  (let ((current (get-vault-position vault-id)))
    (begin
      (try! (assert-authorized-caller))
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (>= current amount) err-insufficient-position)
      (match (call-withdraw amount)
        withdraw-result
          (if withdraw-result
            (let ((updated (- current amount)))
              (begin
                (asserts! (>= (var-get total-deployed) amount) err-insufficient-position)
                (set-vault-position vault-id updated)
                (var-set total-deployed (- (var-get total-deployed) amount))
                (print {
                  event: "v-mind-zest-withdraw",
                  vault-id: vault-id,
                  amount: amount,
                  updated-position: updated,
                  mock-mode: (var-get use-mock)
                })
                (ok amount)
              )
            )
            err-external-call-failed
          )
        external-err
          (begin
            (print {
              event: "v-mind-zest-withdraw-failed",
              vault-id: vault-id,
              amount: amount,
              external-error: external-err,
              normalized-error: err-external-call-failed
            })
            err-external-call-failed
          )
      )
    )
  )
)

(define-public (collect-zest-fee (amount uint) (treasury principal))
  (begin
    (try! (assert-authorized-caller))
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (is-eq treasury (contract-call? .protocol-config get-protocol-treasury)) err-invalid-treasury)
    (print {
      event: "v-mind-zest-fee-collected",
      amount: amount,
      treasury: treasury,
      caller: tx-sender
    })
    (ok true)
  )
)

(define-public (emergency-exit-zest (vault-id uint))
  (begin
    (try! (assert-authorized-caller))
    (let ((current (get-vault-position vault-id)))
      (if (is-eq current u0)
        (ok u0)
        (withdraw-from-zest vault-id current)
      )
    )
  )
)

(define-read-only (get-vault-zest-position (vault-id uint))
  (ok (get-vault-position vault-id))
)

(define-read-only (get-vault-zest-underlying-balance (vault-id uint))
  (if (var-get use-mock)
    (let
      (
        (total-underlying (unwrap-panic (contract-call? .mock-zest-protocol get-user-underlying-asset-balance
          (var-get zest-ztoken)
          (var-get zest-asset)
          (adapter-principal)
        )))
        (vault-deployed (get-vault-position vault-id))
        (all-deployed (var-get total-deployed))
      )
      (ok (if (is-eq all-deployed u0) vault-deployed (/ (* total-underlying vault-deployed) all-deployed)))
    )
    (ok (get-vault-position vault-id))
  )
)

(define-read-only (get-mock-mode)
  (ok (var-get use-mock))
)

(define-read-only (get-total-deployed)
  (ok (var-get total-deployed))
)

(define-public (deposit (vault-id uint) (amount uint))
  (deposit-to-zest vault-id amount)
)

(define-public (withdraw (vault-id uint) (amount uint))
  (withdraw-from-zest vault-id amount)
)

(define-read-only (get-balance (vault-id uint))
  (get-vault-zest-underlying-balance vault-id)
)

(define-read-only (get-protocol-info)
  (ok {
    protocol-name: "ZEST",
    protocol-version: "v1"
  })
)
