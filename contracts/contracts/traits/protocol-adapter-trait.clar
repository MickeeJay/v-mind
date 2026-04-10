;; @title V-Mind Protocol Adapter Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Standard adapter interface for integrating external Stacks DeFi protocols.
;; @dev Strategies invoke adapter contracts through this trait to keep integrations composable.
;; @contract protocol-adapter-trait
;; @constants
;; - none
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - deposit: Sends assets into an external protocol position.
;; - withdraw: Pulls assets from an external protocol position.
;; - get-balance: Returns the tracked balance for a vault position.
;; - get-protocol-info: Returns adapter protocol metadata.
;; @external-contracts
;; - Implemented by adapter contracts wrapping external protocol entry points.
;; @limitations
;; - Trait does not enforce slippage limits, oracle correctness, or adapter trustworthiness.

(define-trait protocol-adapter-trait
  (
    (deposit (uint uint) (response uint uint))
    (withdraw (uint uint) (response uint uint))
    (get-balance (uint) (response uint uint))
    (get-protocol-info () (response {
      protocol-name: (string-ascii 32),
      protocol-version: (string-ascii 16)
    } uint))
  )
)
