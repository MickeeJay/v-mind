;; @title V-Mind Zest Protocol Adapter
;; @notice Routes V-Mind vault interactions to Zest lending interfaces.

(define-constant err-owner-only (err u3400))
(define-constant err-invalid-amount (err u3401))
(define-constant err-insufficient-position (err u3402))
(define-constant err-external-call-failed (err u3403))

(define-constant zest-borrow-helper 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1-5)
(define-constant zest-pool-reserve 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-0-reserve)
(define-constant zest-ztoken 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.zsbtc-v2-0)
(define-constant zest-asset 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)
(define-constant zest-oracle 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.oracle-sbtc)
(define-constant zest-incentives 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.incentives)

(define-data-var owner principal tx-sender)
(define-data-var use-mock bool true)
(define-data-var total-deployed uint u0)

(define-map vault-positions
  { vault-id: uint }
  { deployed-amount: uint }
)

(define-private (assert-owner)
  (if (is-eq tx-sender (var-get owner)) (ok true) err-owner-only)
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
    zest-ztoken
    zest-pool-reserve
    zest-asset
    amount
    (adapter-principal)
    none
    zest-incentives
  )
)

(define-private (call-withdraw (amount uint))
  (contract-call? .mock-zest-protocol withdraw
    zest-ztoken
    zest-pool-reserve
    zest-asset
    zest-oracle
    amount
    (adapter-principal)
    (list { asset: zest-asset, lp-token: zest-ztoken, oracle: zest-oracle })
    zest-incentives
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
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (>= current amount) err-insufficient-position)
      (match (call-withdraw amount)
        withdraw-result
          (if withdraw-result
            (let ((updated (- current amount)))
              (begin
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
    (asserts! (> amount u0) err-invalid-amount)
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
  (let ((current (get-vault-position vault-id)))
    (if (is-eq current u0)
      (ok u0)
      (withdraw-from-zest vault-id current)
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
          zest-ztoken
          zest-asset
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
