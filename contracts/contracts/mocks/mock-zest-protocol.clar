;; MOCK CONTRACT - FOR LOCAL TESTING ONLY. NOT FOR DEPLOYMENT.
;; @title Mock Zest Protocol
;; @version 2026-04-10 added deterministic failure toggles and reconciliation safety banner
;; @notice Local test double for Zest borrow-helper and reserve interfaces.

(impl-trait .zest-reserve-trait.zest-reserve-trait)

(define-constant err-insufficient-liquidity (err u8002))
(define-constant err-invalid-input (err u8003))
(define-constant max-uint u340282366920938463463374607431768211455)

(define-data-var force-failure bool false)
(define-data-var forced-error-code uint u8001)

(define-map user-underlying
  { user: principal }
  { amount: uint }
)

(define-private (get-user-amount (user principal))
  (default-to u0 (get amount (map-get? user-underlying { user: user })))
)

(define-private (is-contract-principal (target principal))
  (match (principal-destruct? target)
    principal-data (is-some (get name principal-data))
    principal-data (is-some (get name principal-data))
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

(define-public (set-user-underlying (user principal) (amount uint))
  (let ((current (get-user-amount user)))
    (begin
      (asserts! (is-contract-principal user) err-invalid-input)
      (if (>= amount current)
        (let ((delta (- amount current)))
          (map-set user-underlying { user: user } { amount: (+ current delta) })
        )
        (let ((delta (- current amount)))
          (map-set user-underlying { user: user } { amount: (- current delta) })
        )
      )
      (ok true)
    )
  )
)

(define-public (supply
  (lp principal)
  (pool-reserve principal)
  (asset principal)
  (amount uint)
  (owner principal)
  (referral (optional principal))
  (incentives principal)
)
  (begin
    (asserts! (is-contract-principal owner) err-invalid-input)
    (let ((current (get-user-amount owner)))
      (if (var-get force-failure)
        (err (var-get forced-error-code))
        (begin
          (is-eq lp lp)
          (is-eq pool-reserve pool-reserve)
          (is-eq asset asset)
          (is-eq referral referral)
          (is-eq incentives incentives)
          (asserts! (<= amount (- max-uint current)) err-invalid-input)
          (map-set user-underlying { user: owner } { amount: (+ current amount) })
          (ok true)
        )
      )
    )
  )
)

(define-public (withdraw
  (lp principal)
  (pool-reserve principal)
  (asset principal)
  (oracle principal)
  (amount uint)
  (owner principal)
  (assets (list 100 { asset: principal, lp-token: principal, oracle: principal }))
  (incentives principal)
  (price-feed-bytes (optional (buff 8192)))
)
  (begin
    (asserts! (is-contract-principal owner) err-invalid-input)
    (let ((current (get-user-amount owner)))
      (if (var-get force-failure)
        (err (var-get forced-error-code))
        (begin
          (is-eq lp lp)
          (is-eq pool-reserve pool-reserve)
          (is-eq asset asset)
          (is-eq oracle oracle)
          (is-eq assets assets)
          (is-eq incentives incentives)
          (is-eq price-feed-bytes price-feed-bytes)
          (asserts! (>= current amount) err-insufficient-liquidity)
          (map-set user-underlying { user: owner } { amount: (- current amount) })
          (ok true)
        )
      )
    )
  )
)

(define-read-only (get-user-underlying-asset-balance (lp-token principal) (asset principal) (user principal))
  (begin
    (is-eq lp-token lp-token)
    (is-eq asset asset)
    (if (var-get force-failure)
      (err (var-get forced-error-code))
      (ok (get-user-amount user))
    )
  )
)

(define-read-only (get-mock-user-underlying (user principal))
  (ok (get-user-amount user))
)

(define-read-only (get-force-failure-state)
  (ok { enabled: (var-get force-failure), code: (var-get forced-error-code) })
)
