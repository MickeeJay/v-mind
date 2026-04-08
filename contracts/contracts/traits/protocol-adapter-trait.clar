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
;; - harvest: Realizes rewards and returns harvested amount.
;; - quote-withdraw: Estimates assets for a prospective withdrawal size.
;; @external-contracts
;; - Implemented by adapter contracts wrapping external protocol entry points.
;; @limitations
;; - Trait does not enforce slippage limits, oracle correctness, or adapter trustworthiness.

(define-trait protocol-adapter-trait
  (
    (deposit (uint principal) (response uint uint))
    (withdraw (uint principal) (response uint uint))
    (harvest (principal) (response uint uint))
    (quote-withdraw (uint) (response uint uint))
  )
)
