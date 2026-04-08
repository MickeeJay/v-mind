;; @title Mock Protocol Adapter
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Test-only protocol adapter that emulates external DeFi position accounting.
;; @dev Implements protocol-adapter-trait-compatible entry points with deterministic state.
;; @contract mock-protocol-adapter
;; @constants
;; - err-insufficient-liquidity: Returned when mock adapter cannot satisfy withdrawal.
;; @data-vars
;; - total-position-assets: Simulated assets deployed into external position.
;; - last-harvest-amount: Last harvest amount returned by harvest.
;; @maps
;; - none
;; @public-functions
;; - deposit: Increases simulated external position assets.
;; - withdraw: Decreases simulated external position assets.
;; - harvest: Sets and returns deterministic mock reward value.
;; - quote-withdraw: Returns prospective withdraw amount.
;; @external-contracts
;; - Used by strategy and vault integration tests.
;; @limitations
;; - No slippage, fee, oracle, or market movement simulation.

(define-constant err-insufficient-liquidity (err u3200))

(define-data-var total-position-assets uint u0)
(define-data-var last-harvest-amount uint u0)

(define-public (deposit (amount uint) (caller principal))
  (begin
    (var-set total-position-assets (+ (var-get total-position-assets) amount))
    (ok (var-get total-position-assets))
  )
)

(define-public (withdraw (amount uint) (recipient principal))
  (let ((position-assets (var-get total-position-assets)))
    (begin
      (asserts! (>= position-assets amount) err-insufficient-liquidity)
      (var-set total-position-assets (- position-assets amount))
      (ok amount)
    )
  )
)

(define-public (harvest (caller principal))
  (begin
    (var-set last-harvest-amount u10)
    (ok (var-get last-harvest-amount))
  )
)

(define-read-only (quote-withdraw (shares uint))
  (ok shares)
)
