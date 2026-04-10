;; @title V-Mind Strategy Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Interface every approved strategy contract must implement.
;; @dev Vault contracts call these entry points to validate and execute strategy logic.
;; @contract strategy-trait
;; @constants
;; - none
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - get-strategy-id: Returns the unique on-chain strategy identifier.
;; - can-execute: Returns true when a strategy can be executed under current conditions.
;; - execute: Executes strategy logic for a target vault and returns asset delta.
;; - on-deposit: Optional hook called by vault after user deposit.
;; - on-withdraw: Optional hook called by vault before or after withdrawal.
;; @external-contracts
;; - Called by core vault-core contracts.
;; @limitations
;; - Trait enforces signature compatibility only; it cannot enforce economic safety.

(define-trait strategy-trait
  (
    (get-strategy-id () (response uint uint))
    (can-execute (uint uint) (response bool uint))
    (execute (uint principal) (response int uint))
    (on-deposit (uint principal) (response bool uint))
    (on-withdraw (uint principal) (response bool uint))
  )
)
