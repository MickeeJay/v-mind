;; @title V-Mind Error Codes Library
;; @version 0.1.0
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

(define-constant err-not-authorized (err u1000))
(define-constant err-paused (err u1001))
(define-constant err-invalid-argument (err u1002))
(define-constant err-not-found (err u1003))
(define-constant err-already-exists (err u1004))
(define-constant err-not-implemented (err u1999))

(define-read-only (get-error-domain)
  (ok u1)
)
