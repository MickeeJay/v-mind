;; @title V-Mind Vault Accounting Library
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Provides deterministic accounting helpers for asset-to-share and share-to-asset conversions.
;; @dev Functions are pure calculations and do not mutate global state.
;; @contract vault-accounting-lib
;; @constants
;; - err-invalid-input: Returned when invalid totals are provided.
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - preview-shares: Calculates shares minted for a given asset deposit.
;; - preview-assets: Calculates assets redeemable for a given share amount.
;; @external-contracts
;; - none
;; @limitations
;; - Rounding behavior uses integer division and truncates toward zero.
;; - Callers must ensure decimal normalization for underlying assets.

(define-constant err-invalid-input (err u1200))

(define-read-only (preview-shares (assets uint) (total-assets uint) (total-shares uint))
  (if (is-eq assets u0)
      err-invalid-input
      (if (or (is-eq total-assets u0) (is-eq total-shares u0))
          (ok assets)
          (ok (/ (* assets total-shares) total-assets))
      )
  )
)

(define-read-only (preview-assets (shares uint) (total-assets uint) (total-shares uint))
  (if (or (is-eq shares u0) (is-eq total-shares u0))
      err-invalid-input
      (ok (/ (* shares total-assets) total-shares))
  )
)
