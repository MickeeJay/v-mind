;; @title Mock Zest Protocol
;; @notice Local test double for Zest borrow-helper and reserve interfaces.

(define-constant err-forced-failure (err u8001))
(define-constant err-insufficient-liquidity (err u8002))

(define-data-var force-failure bool false)
(define-data-var forced-error-code uint u8001)

(define-map user-underlying
  { user: principal }
  { amount: uint }
)

(define-private (get-user-amount (user principal))
  (default-to u0 (get amount (map-get? user-underlying { user: user })))
)

(define-public (set-force-failure (enabled bool) (error-code uint))
  (begin
    (var-set force-failure enabled)
    (var-set forced-error-code error-code)
    (ok true)
  )
)

(define-public (set-user-underlying (user principal) (amount uint))
  (begin
    (map-set user-underlying { user: user } { amount: amount })
    (ok true)
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
  (let ((current (get-user-amount owner)))
    (if (var-get force-failure)
      (err (var-get forced-error-code))
      (begin
        (map-set user-underlying { user: owner } { amount: (+ current amount) })
        (ok true)
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
  (let ((current (get-user-amount owner)))
    (if (var-get force-failure)
      (err (var-get forced-error-code))
      (begin
        (asserts! (>= current amount) err-insufficient-liquidity)
        (map-set user-underlying { user: owner } { amount: (- current amount) })
        (ok true)
      )
    )
  )
)

(define-read-only (get-user-underlying-asset-balance (lp-token principal) (asset principal) (user principal))
  (ok (get-user-amount user))
)

(define-read-only (get-mock-user-underlying (user principal))
  (ok (get-user-amount user))
)
