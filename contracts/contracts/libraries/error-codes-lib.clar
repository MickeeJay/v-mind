;; @title V-Mind Error Codes Library
;; @version 2026-04-10 consolidated protocol-wide named error code catalog
;; @author V-Mind Core Team
;; @notice Canonical error code definitions for the V-Mind protocol contract suite.
;; @dev This contract provides a single source of truth for error classes used across modules.
;; @contract error-codes-lib
;; @constants
;; - err-not-authorized: Returned when caller lacks required permissions.
;; - err-paused: Returned when protocol or module is paused.
;; - err-invalid-argument: Returned when an input value fails validation.
;; - err-not-found: Returned when requested entity does not exist.
;; - err-already-exists: Returned when creating an entity that already exists.
;; - err-not-implemented: Returned by scaffolded functions until logic is implemented.
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - get-error-domain: Returns the V-Mind error domain identifier for off-chain indexing.
;; @external-contracts
;; - none
;; @limitations
;; - Clarity contracts cannot import constants from another contract at compile time.
;; - Downstream contracts may duplicate numeric codes during early scaffolding.

(define-read-only (get-error-domain)
  (ok u1)
)
