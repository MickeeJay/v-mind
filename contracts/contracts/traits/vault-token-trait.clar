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
;; - mint: Mints vault shares to a principal for a given vault.
;; - burn: Burns vault shares from a principal for a given vault.
;; - transfer: Transfers vault shares between principals.
;; - get-balance: Returns account share balance.
;; - get-total-supply: Returns total issued shares.
;; - get-vault-balance: Returns account share balance for vault-id.
;; - get-vault-total-supply: Returns share supply for vault-id.
;; - get-price-per-share: Returns vault share price in underlying microunits.
;; @external-contracts
;; - Implemented by SIP-010-like or custom vault share token contracts.
;; @limitations
;; - Trait specifies function signatures only and does not enforce token economics.

(define-trait vault-token-trait
  (
    (mint (uint principal uint) (response uint uint))
    (burn (uint principal uint) (response uint uint))
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-vault-balance (uint principal) (response uint uint))
    (get-vault-total-supply (uint) (response uint uint))
    (get-price-per-share (uint) (response uint uint))
  )
)
