;; MOCK CONTRACT - FOR LOCAL TESTING ONLY. NOT FOR DEPLOYMENT.
;; @title Mock StackingDAO Core
;; @version 2026-04-10 added deterministic failure toggles and reconciliation safety banner
;; @notice Local test double for StackingDAO core/reserve/helper interfaces.

(impl-trait .stackingdao-direct-helpers-trait.stackingdao-direct-helpers-trait)

(define-constant one-8 u100000000)

(define-constant err-insufficient-shares (err u8202))
(define-constant err-invalid-input (err u8203))
(define-constant max-uint u340282366920938463463374607431768211455)

(define-data-var force-failure bool false)
(define-data-var forced-error-code uint u8201)
(define-data-var stx-per-ststx uint one-8)
(define-data-var total-shares uint u0)

(define-map shares-by-user
  { user: principal }
  { shares: uint }
)

(define-private (get-shares (user principal))
  (default-to u0 (get shares (map-get? shares-by-user { user: user })))
)

(define-private (underlying-from-shares (shares uint))
  (/ (* shares (var-get stx-per-ststx)) one-8)
)

(define-private (shares-from-underlying (amount uint))
  (if (is-eq (var-get stx-per-ststx) u0)
    amount
    (/ (* amount one-8) (var-get stx-per-ststx))
  )
)

(define-public (set-force-failure (enabled bool) (error-code uint))
  (begin
    (asserts! (> error-code u0) err-invalid-input)
    (var-set force-failure enabled)
    (var-set forced-error-code error-code)
    (ok true)
  )
)

(define-public (set-exchange-rate (new-rate uint))
  (begin
    (asserts! (> new-rate u0) err-invalid-input)
    (var-set stx-per-ststx new-rate)
    (ok true)
  )
)

(define-public (deposit
  (reserve principal)
  (commission-contract principal)
  (staking-contract principal)
  (direct-helpers principal)
  (stx-amount uint)
  (referrer (optional principal))
  (pool (optional principal))
)
  (if (var-get force-failure)
    (err (var-get forced-error-code))
    (let
      (
        (current (get-shares tx-sender))
        (current-total (var-get total-shares))
        (minted (shares-from-underlying stx-amount))
      )
      (begin
        (is-eq reserve reserve)
        (is-eq commission-contract commission-contract)
        (is-eq staking-contract staking-contract)
        (is-eq direct-helpers direct-helpers)
        (is-eq referrer referrer)
        (is-eq pool pool)
        (asserts! (> stx-amount u0) err-invalid-input)
        (asserts! (<= stx-amount (/ max-uint one-8)) err-invalid-input)
        (asserts! (<= minted (- max-uint current)) err-invalid-input)
        (asserts! (<= minted (- max-uint current-total)) err-invalid-input)
        (map-set shares-by-user { user: tx-sender } { shares: (+ current minted) })
        (var-set total-shares (+ current-total minted))
        (ok minted)
      )
    )
  )
)

(define-read-only (init-withdraw (reserve principal) (direct-helpers principal) (ststx-amount uint))
  (if (var-get force-failure)
    (err (var-get forced-error-code))
    (begin
      (is-eq reserve reserve)
      (is-eq direct-helpers direct-helpers)
      (ok ststx-amount)
    )
  )
)

(define-public (withdraw-idle
  (reserve principal)
  (direct-helpers principal)
  (commission-contract principal)
  (staking-contract principal)
  (ststx-amount uint)
)
  (let ((current (get-shares tx-sender)))
    (if (var-get force-failure)
      (err (var-get forced-error-code))
      (begin
        (is-eq reserve reserve)
        (is-eq direct-helpers direct-helpers)
        (is-eq commission-contract commission-contract)
        (is-eq staking-contract staking-contract)
        (asserts! (>= current ststx-amount) err-insufficient-shares)
        (map-set shares-by-user { user: tx-sender } { shares: (- current ststx-amount) })
        (var-set total-shares (- (var-get total-shares) ststx-amount))
        (let ((stx-out (underlying-from-shares ststx-amount)))
          (ok { stx-fee-amount: u0, stx-user-amount: stx-out })
        )
      )
    )
  )
)

(define-read-only (get-total-stx)
  (ok (underlying-from-shares (var-get total-shares)))
)

(define-read-only (get-user-balance-in-protocol (user principal) (protocol principal) (index uint))
  (if (var-get force-failure)
    (err (var-get forced-error-code))
    (begin
      (is-eq protocol protocol)
      (is-eq index index)
      (ok (underlying-from-shares (get-shares user)))
    )
  )
)

(define-read-only (get-user-shares (user principal))
  (ok (get-shares user))
)

(define-read-only (get-force-failure-state)
  (ok { enabled: (var-get force-failure), code: (var-get forced-error-code) })
)

(define-read-only (get-exchange-rate)
  (ok (var-get stx-per-ststx))
)
