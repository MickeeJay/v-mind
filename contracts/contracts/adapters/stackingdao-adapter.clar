;; @title V-Mind StackingDAO Adapter
;; @notice Routes V-Mind vault interactions to StackingDAO stSTX contracts.

(define-constant one-8 u100000000)

(define-constant err-owner-only (err u3600))
(define-constant err-invalid-amount (err u3601))
(define-constant err-insufficient-position (err u3602))
(define-constant err-external-call-failed (err u3603))

(define-constant stackingdao-core-mainnet 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v6)
(define-constant stackingdao-reserve-mainnet 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.reserve-v1)
(define-constant stackingdao-commission-mainnet 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.commission-v2)
(define-constant stackingdao-staking-mainnet 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.staking-v0)
(define-constant stackingdao-helpers-mainnet 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.direct-helpers-v4)

(define-data-var owner principal tx-sender)
(define-data-var use-mock bool true)

(define-data-var core-contract principal 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v6)
(define-data-var reserve-contract principal 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.reserve-v1)
(define-data-var commission-contract principal 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.commission-v2)
(define-data-var staking-contract principal 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.staking-v0)
(define-data-var helpers-contract principal 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.direct-helpers-v4)

(define-data-var total-ststx-shares uint u0)
(define-data-var total-principal-tracked uint u0)

(define-map vault-positions
  { vault-id: uint }
  {
    ststx-shares: uint,
    stx-principal-deployed: uint
  }
)

(define-private (assert-owner)
  (if (is-eq tx-sender (var-get owner)) (ok true) err-owner-only)
)

(define-private (adapter-principal)
  (as-contract tx-sender)
)

(define-private (get-position (vault-id uint))
  (default-to { ststx-shares: u0, stx-principal-deployed: u0 } (map-get? vault-positions { vault-id: vault-id }))
)

(define-private (set-position (vault-id uint) (shares uint) (principal-deployed uint))
  (map-set vault-positions { vault-id: vault-id } { ststx-shares: shares, stx-principal-deployed: principal-deployed })
)

(define-private (get-total-underlying)
  (if (var-get use-mock)
    (match (contract-call? .mock-stackingdao-core get-user-balance-in-protocol (adapter-principal) stackingdao-staking-mainnet u0)
      amount amount
      helper-err (var-get total-principal-tracked)
    )
    (var-get total-principal-tracked)
  )
)

(define-public (set-mock-mode (enabled bool))
  (begin
    (try! (assert-owner))
    (var-set use-mock enabled)
    (ok true)
  )
)

(define-public (set-stackingdao-config
  (new-core principal)
  (new-reserve principal)
  (new-commission principal)
  (new-staking principal)
  (new-helpers principal)
)
  (begin
    (try! (assert-owner))
    (var-set core-contract new-core)
    (var-set reserve-contract new-reserve)
    (var-set commission-contract new-commission)
    (var-set staking-contract new-staking)
    (var-set helpers-contract new-helpers)
    (ok true)
  )
)

(define-public (mint-ststx (vault-id uint) (amount uint))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (match
      (contract-call? .mock-stackingdao-core deposit
        stackingdao-reserve-mainnet
        stackingdao-commission-mainnet
        stackingdao-staking-mainnet
        stackingdao-helpers-mainnet
        amount
        none
        none
      )
      minted-shares
        (let
          (
            (position (get-position vault-id))
            (updated-shares (+ (get ststx-shares position) minted-shares))
            (updated-principal (+ (get stx-principal-deployed position) amount))
          )
          (begin
            (set-position vault-id updated-shares updated-principal)
            (var-set total-ststx-shares (+ (var-get total-ststx-shares) minted-shares))
            (var-set total-principal-tracked (+ (var-get total-principal-tracked) amount))
            (print {
              event: "v-mind-stackingdao-mint",
              vault-id: vault-id,
              stx-in: amount,
              ststx-minted: minted-shares,
              vault-ststx-shares: updated-shares
            })
            (ok minted-shares)
          )
        )
      external-err
        (begin
          (print {
            event: "v-mind-stackingdao-mint-failed",
            vault-id: vault-id,
            stx-in: amount,
            external-error: external-err
          })
          err-external-call-failed
        )
    )
  )
)

(define-public (redeem-ststx (vault-id uint) (amount uint))
  (let
    (
      (position (get-position vault-id))
      (current-shares (get ststx-shares position))
      (current-principal (get stx-principal-deployed position))
    )
    (begin
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (>= current-shares amount) err-insufficient-position)
      (match
        (contract-call? .mock-stackingdao-core withdraw-idle
          stackingdao-reserve-mainnet
          stackingdao-helpers-mainnet
          stackingdao-commission-mainnet
          stackingdao-staking-mainnet
          amount
        )
        withdraw-result
          (let
            (
              (stx-user-amount (get stx-user-amount withdraw-result))
              (updated-shares (- current-shares amount))
              (updated-principal (if (>= current-principal stx-user-amount) (- current-principal stx-user-amount) u0))
            )
            (begin
              (set-position vault-id updated-shares updated-principal)
              (var-set total-ststx-shares (- (var-get total-ststx-shares) amount))
              (var-set total-principal-tracked (if (>= (var-get total-principal-tracked) stx-user-amount) (- (var-get total-principal-tracked) stx-user-amount) u0))
              (print {
                event: "v-mind-stackingdao-redeem",
                vault-id: vault-id,
                ststx-burned: amount,
                stx-out: stx-user-amount,
                stx-fee: (get stx-fee-amount withdraw-result),
                vault-ststx-shares: updated-shares
              })
              (ok stx-user-amount)
            )
          )
        external-err
          (begin
            (print {
              event: "v-mind-stackingdao-redeem-failed",
              vault-id: vault-id,
              ststx-burned: amount,
              external-error: external-err
            })
            err-external-call-failed
          )
      )
    )
  )
)

(define-public (collect-stackingdao-fee (amount uint) (treasury principal))
  (begin
    (asserts! (> amount u0) err-invalid-amount)
    (print {
      event: "v-mind-stackingdao-fee-collected",
      amount: amount,
      treasury: treasury,
      caller: tx-sender
    })
    (ok true)
  )
)

(define-public (emergency-exit-stackingdao (vault-id uint))
  (let ((shares (get ststx-shares (get-position vault-id))))
    (if (is-eq shares u0)
      (ok u0)
      (redeem-ststx vault-id shares)
    )
  )
)

(define-read-only (get-vault-ststx-shares (vault-id uint))
  (ok (get ststx-shares (get-position vault-id)))
)

(define-read-only (get-ststx-exchange-rate)
  (let
    (
      (total-shares (var-get total-ststx-shares))
      (total-underlying (get-total-underlying))
    )
    (ok
      (if (is-eq total-shares u0)
        one-8
        (/ (* total-underlying one-8) total-shares)
      )
    )
  )
)

(define-read-only (get-vault-stx-balance (vault-id uint))
  (let
    (
      (shares (get ststx-shares (get-position vault-id)))
      (rate (unwrap-panic (get-ststx-exchange-rate)))
    )
    (ok (/ (* shares rate) one-8))
  )
)
