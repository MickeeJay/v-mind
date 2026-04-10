;; @title Mock Strategy
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Test-only strategy implementation used for local Clarinet and integration tests.
;; @dev Implements strategy-trait-compatible signatures with deterministic behavior.
;; @contract mock-strategy
;; @constants
;; - err-execution-disabled: Returned when mock execution switch is off.
;; @data-vars
;; - strategy-id: Mock strategy identifier.
;; - executable: Flag controlling can-execute and execute behavior.
;; @maps
;; - none
;; @public-functions
;; - set-executable: Enables or disables execution path.
;; - get-strategy-id: Returns configured mock strategy id.
;; - can-execute: Returns executable state.
;; - execute: Returns positive delta when executable.
;; - on-deposit: No-op hook that returns true.
;; - on-withdraw: No-op hook that returns true.
;; @external-contracts
;; - Used by test suites targeting vault-core and strategy-registry.
;; @limitations
;; - Mock behavior is intentionally simplistic and not production safe.

(define-constant err-execution-disabled (err u3000))

(define-data-var strategy-id uint u999)
(define-data-var executable bool true)

(define-public (set-executable (enabled bool))
  (ok (var-set executable enabled))
)

(define-public (get-strategy-id)
  (ok (var-get strategy-id))
)

(define-public (can-execute (vault-balance uint) (current-cycle uint))
  (ok (var-get executable))
)

(define-public (execute (vault-id uint) (vault-contract principal))
  (if (var-get executable)
      (ok 1)
      err-execution-disabled
  )
)

(define-public (on-deposit (amount uint) (depositor principal))
  (ok true)
)

(define-public (on-withdraw (amount uint) (withdrawer principal))
  (ok true)
)
