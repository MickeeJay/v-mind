;; @title V-Mind Strategy Validation Library
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Shared validation helpers for strategy metadata and execution boundaries.
;; @dev This contract standardizes checks used by strategy registry and vault contracts.
;; @contract strategy-validation-lib
;; @constants
;; - max-name-len: Maximum strategy display name length.
;; - max-uri-len: Maximum strategy metadata URI length.
;; - err-validation-failed: Returned when any field fails validation.
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - validate-strategy-metadata: Validates name and metadata URI constraints.
;; - validate-risk-score: Validates strategy risk score range.
;; @external-contracts
;; - none
;; @limitations
;; - Validation does not verify off-chain metadata integrity.

(define-constant max-name-len u64)
(define-constant max-uri-len u256)
(define-constant err-validation-failed (err u1300))

(define-read-only (is-valid-strategy-type (strategy-type uint))
  (ok (and (>= strategy-type u1) (<= strategy-type u4)))
)

(define-read-only (is-valid-risk-tier (risk-tier uint))
  (ok (and (>= risk-tier u1) (<= risk-tier u3)))
)

(define-read-only (
  validate-strategy-params
  (name (string-ascii 64))
  (strategy-type uint)
  (risk-tier uint)
)
  (let (
      (valid-name (and (> (len name) u0) (<= (len name) max-name-len)))
      (valid-type (unwrap-panic (is-valid-strategy-type strategy-type)))
      (valid-risk (unwrap-panic (is-valid-risk-tier risk-tier)))
    )
    (if (and valid-name valid-type valid-risk)
      (ok true)
      err-validation-failed
    )
  )
)

(define-read-only (validate-strategy-metadata (name (string-ascii 64)) (metadata-uri (string-ascii 256)))
  (if (or (is-eq (len name) u0) (is-eq (len metadata-uri) u0))
      err-validation-failed
      (ok true)
  )
)

(define-read-only (validate-risk-score (risk-score uint))
  (if (> risk-score u100)
      err-validation-failed
      (ok true)
  )
)
