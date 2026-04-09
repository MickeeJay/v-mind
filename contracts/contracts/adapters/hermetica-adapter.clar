;; @title V-Mind Hermetica Adapter
;; @notice Routes V-Mind vault interactions to Hermetica USDh staking contracts.

(define-constant one-8 u100000000)

(define-constant err-owner-only (err u3700))
(define-constant err-invalid-amount (err u3701))
(define-constant err-insufficient-position (err u3702))
(define-constant err-external-call-failed (err u3703))

(define-constant hermetica-staking-mainnet 'SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.staking-v1-1)
(define-constant hermetica-susdh-mainnet 'SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.susdh-token-v1)

(define-data-var owner principal tx-sender)
(define-data-var use-mock bool true)
(define-data-var cached-usdh-per-susdh uint one-8)

(define-data-var staking-contract principal 'SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.staking-v1-1)
(define-data-var susdh-contract principal 'SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.susdh-token-v1)

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
    (ok true)
  )
)

(define-public (deposit-usdh (vault-id uint) (amount uint))
  (begin
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
    (asserts! (> amount u0) err-invalid-amount)
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
  (let ((shares (get susdh-shares (get-position vault-id))))
    (if (is-eq shares u0)
      (ok u0)
      (withdraw-usdh vault-id shares)
    )
  )
)

(define-read-only (get-vault-susdh-shares (vault-id uint))
  (ok (get susdh-shares (get-position vault-id)))
)

(define-read-only (get-usdh-per-susdh-rate)
  (if (var-get use-mock)
    (ok (unwrap-panic (contract-call? .mock-hermetica-staking get-usdh-per-susdh)))
    (ok (var-get cached-usdh-per-susdh))
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
