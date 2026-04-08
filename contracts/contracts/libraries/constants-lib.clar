;; @title V-Mind Constants Library
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Defines global protocol constants used in validation and fee calculations.
;; @dev Constants are exposed through read-only functions for discovery by off-chain services.
;; @contract constants-lib
;; @constants
;; - bps-denominator: Basis point denominator used for all fee math.
;; - max-platform-fee-bps: Upper bound for protocol-level fee configuration.
;; - max-performance-fee-bps: Upper bound for strategy performance fee.
;; - role-owner: Canonical role ID representing the protocol owner.
;; - role-operator: Canonical role ID for strategy operators.
;; - role-guardian: Canonical role ID for emergency guardians.
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - get-bps-denominator: Returns basis-point denominator.
;; - get-role-owner: Returns role ID for owner.
;; - get-role-operator: Returns role ID for operator.
;; - get-role-guardian: Returns role ID for guardian.
;; @external-contracts
;; - none
;; @limitations
;; - Constants are static and require redeployment to change.

(define-constant bps-denominator u10000)
(define-constant max-platform-fee-bps u1000)
(define-constant max-performance-fee-bps u3000)
(define-constant role-owner u1)
(define-constant role-operator u2)
(define-constant role-guardian u3)

(define-read-only (get-bps-denominator)
  (ok bps-denominator)
)

(define-read-only (get-role-owner)
  (ok role-owner)
)

(define-read-only (get-role-operator)
  (ok role-operator)
)

(define-read-only (get-role-guardian)
  (ok role-guardian)
)
