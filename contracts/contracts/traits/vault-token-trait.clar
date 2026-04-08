;; @title V-Mind Vault Token Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Interface for vault receipt token contracts used to represent depositor shares.
;; @dev Vault contracts depend on this trait for minting, burning, and transfers.
;; @contract vault-token-trait
;; @constants
;; - none
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - mint: Mints vault shares to a principal.
;; - burn: Burns vault shares from a principal.
;; - transfer: Transfers vault shares between principals.
;; - get-balance: Returns account share balance.
;; - get-total-supply: Returns total issued shares.
;; @external-contracts
;; - Implemented by SIP-010-like or custom vault share token contracts.
;; @limitations
;; - Trait specifies function signatures only and does not enforce token economics.

(define-trait vault-token-trait
  (
    (mint (principal uint) (response bool uint))
    (burn (principal uint) (response bool uint))
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
  )
)
