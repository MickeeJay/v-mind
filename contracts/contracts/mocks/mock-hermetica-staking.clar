;; MOCK CONTRACT - FOR LOCAL TESTING ONLY. NOT FOR DEPLOYMENT.
;; @title Mock Hermetica Staking
;; @version 2026-04-10 added deterministic failure toggles and reconciliation safety banner
;; @notice Local test double for Hermetica staking and sUSDh token interfaces.

(define-constant one-8 u100000000)

(define-constant err-forced-failure (err u8301))
(define-constant err-insufficient-shares (err u8302))

(define-data-var force-failure bool false)
(define-data-var forced-error-code uint u8301)
(define-data-var usdh-per-susdh uint one-8)
(define-data-var total-susdh uint u0)

(define-map shares-by-user
  { user: principal }
  { shares: uint }
)

(define-private (get-shares (user principal))
  (default-to u0 (get shares (map-get? shares-by-user { user: user })))
)

(define-private (shares-from-usdh (amount uint))
  (if (is-eq (var-get usdh-per-susdh) u0)
    amount
    (/ (* amount one-8) (var-get usdh-per-susdh))
  )
)

(define-private (usdh-from-shares (shares uint))
  (/ (* shares (var-get usdh-per-susdh)) one-8)
)

(define-public (set-force-failure (enabled bool) (error-code uint))
  (begin
    (var-set force-failure enabled)
    (var-set forced-error-code error-code)
    (ok true)
  )
)

(define-public (set-usdh-per-susdh (new-rate uint))
  (begin
    (var-set usdh-per-susdh new-rate)
    (ok true)
  )
)

(define-public (stake (amount uint) (affiliate (optional (buff 64))))
  (if (var-get force-failure)
    (err (var-get forced-error-code))
    (let
      (
        (minted (shares-from-usdh amount))
        (current (get-shares tx-sender))
      )
      (begin
        (map-set shares-by-user { user: tx-sender } { shares: (+ current minted) })
        (var-set total-susdh (+ (var-get total-susdh) minted))
        (ok true)
      )
    )
  )
)

(define-public (unstake (amount uint))
  (let ((current (get-shares tx-sender)))
    (if (var-get force-failure)
      (err (var-get forced-error-code))
      (begin
        (asserts! (>= current amount) err-insufficient-shares)
        (map-set shares-by-user { user: tx-sender } { shares: (- current amount) })
        (var-set total-susdh (- (var-get total-susdh) amount))
        (ok (usdh-from-shares amount))
      )
    )
  )
)

(define-read-only (get-usdh-per-susdh)
  (ok (var-get usdh-per-susdh))
)

(define-read-only (get-balance (account principal))
  (ok (get-shares account))
)

(define-read-only (get-total-supply)
  (ok (var-get total-susdh))
)

(define-read-only (get-force-failure-state)
  (ok { enabled: (var-get force-failure), code: (var-get forced-error-code) })
)
