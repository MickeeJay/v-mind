;; @title Mock ALEX AMM
;; @notice Local test double for ALEX add/reduce liquidity interfaces.

(define-constant one-8 u100000000)

(define-constant err-forced-failure (err u8101))
(define-constant err-no-liquidity (err u8102))

(define-data-var force-failure bool false)
(define-data-var forced-error-code uint u8101)

(define-map lp-balances
  { provider: principal }
  { amount: uint }
)

(define-private (get-lp (provider principal))
  (default-to u0 (get amount (map-get? lp-balances { provider: provider })))
)

(define-public (set-force-failure (enabled bool) (error-code uint))
  (begin
    (var-set force-failure enabled)
    (var-set forced-error-code error-code)
    (ok true)
  )
)

(define-public (add-to-position
  (token-x-trait principal)
  (token-y-trait principal)
  (factor uint)
  (dx uint)
  (max-dy (optional uint))
)
  (if (var-get force-failure)
    (err (var-get forced-error-code))
    (let
      (
        (dy (default-to (/ dx u2) max-dy))
        (supply dx)
        (current (get-lp tx-sender))
      )
      (begin
        (map-set lp-balances { provider: tx-sender } { amount: (+ current supply) })
        (ok { dx: dx, dy: dy, supply: supply })
      )
    )
  )
)

(define-public (reduce-position
  (token-x-trait principal)
  (token-y-trait principal)
  (factor uint)
  (percent uint)
)
  (let ((current (get-lp tx-sender)))
    (if (var-get force-failure)
      (err (var-get forced-error-code))
      (let ((burned (/ (* current percent) one-8)))
        (begin
          (asserts! (> burned u0) err-no-liquidity)
          (map-set lp-balances { provider: tx-sender } { amount: (- current burned) })
          (ok { dx: burned, dy: (/ burned u2) })
        )
      )
    )
  )
)

(define-read-only (get-position-given-mint (token-x principal) (token-y principal) (factor uint) (token-amount uint))
  (ok { dx: token-amount, dy: (/ token-amount u2) })
)

(define-read-only (get-lp-balance (provider principal))
  (ok (get-lp provider))
)
