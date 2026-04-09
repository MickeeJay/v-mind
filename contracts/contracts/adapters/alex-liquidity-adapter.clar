;; @title V-Mind ALEX Liquidity Adapter
;; @notice Routes V-Mind vault interactions to ALEX AMM interfaces.

(define-constant one-8 u100000000)

(define-constant err-owner-only (err u3500))
(define-constant err-invalid-amount (err u3501))
(define-constant err-insufficient-position (err u3502))
(define-constant err-external-call-failed (err u3503))

(define-constant alex-mainnet-amm 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.amm-swap-pool-v1-1)

(define-data-var owner principal tx-sender)
(define-data-var use-mock bool true)
(define-data-var token-x principal 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)
(define-data-var token-y principal 'SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.usdh-token-v1)
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

(define-private (get-position (vault-id uint))
  (default-to { lp-balance: u0, token-x-deployed: u0 } (map-get? vault-positions { vault-id: vault-id }))
)

(define-private (set-position (vault-id uint) (lp-balance uint) (token-x-deployed uint))
  (map-set vault-positions { vault-id: vault-id } { lp-balance: lp-balance, token-x-deployed: token-x-deployed })
)

(define-private (call-add-position (amount uint))
  (contract-call? .mock-alex-amm add-to-position
    (var-get token-x)
    (var-get token-y)
    (var-get pool-factor)
    amount
    none
  )
)

(define-private (call-reduce-position (percent uint))
  (contract-call? .mock-alex-amm reduce-position
    (var-get token-x)
    (var-get token-y)
    (var-get pool-factor)
    percent
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
    (var-set token-x new-token-x)
    (var-set token-y new-token-y)
    (var-set pool-factor new-pool-factor)
    (ok true)
  )
)

(define-public (provide-alex-liquidity (vault-id uint) (amount uint))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (match (call-add-position amount)
      add-result
        (let
          (
            (dx (get dx add-result))
            (dy (get dy add-result))
            (minted-lp (get supply add-result))
            (position (get-position vault-id))
            (updated-lp (+ (get lp-balance position) minted-lp))
            (updated-token-x (+ (get token-x-deployed position) dx))
          )
          (begin
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
  (let
    (
      (position (get-position vault-id))
      (current-lp (get lp-balance position))
      (current-token-x (get token-x-deployed position))
    )
    (begin
      (asserts! (> amount u0) err-invalid-amount)
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

(define-public (collect-alex-fee (amount uint) (treasury principal))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (print {
      event: "v-mind-alex-fee-collected",
      amount: amount,
      treasury: treasury,
      caller: tx-sender
    })
    (ok true)
  )
)

(define-public (emergency-exit-alex (vault-id uint))
  (let ((current-lp (get lp-balance (get-position vault-id))))
    (if (is-eq current-lp u0)
      (ok u0)
      (withdraw-alex-liquidity vault-id current-lp)
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
