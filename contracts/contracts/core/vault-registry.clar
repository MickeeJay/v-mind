;; @title V-Mind Vault Registry
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Registry for all deployed strategy vault contracts and their metadata.
;; @dev This contract is the canonical source for vault discovery, status, and vault-to-strategy mapping.
;; @contract vault-registry
;; @constants
;; - err-owner-only: Returned when caller is not registry owner.
;; - err-not-found: Returned when vault ID does not exist.
;; - err-already-registered: Returned when vault contract is already registered.
;; @data-vars
;; - registry-owner: Principal with authority to register and update vault metadata.
;; - next-vault-id: Auto-incrementing vault identifier counter.
;; @maps
;; - vaults: Maps vault IDs to vault contract principal, strategy ID, and lifecycle metadata.
;; - vault-id-by-contract: Reverse lookup from vault principal to vault ID.
;; @public-functions
;; - register-vault: Registers a newly deployed vault contract and metadata.
;; - set-vault-enabled: Enables or disables a registered vault.
;; - update-vault-metadata: Updates human-readable metadata URI.
;; @external-contracts
;; - Depends on: strategy-registry for strategy ID linkage validation (planned).
;; - Consumed by: frontends, strategy-vault deployments, protocol analytics.
;; @limitations
;; - This scaffold does not yet validate vault contract behavior beyond principal registration.

(define-constant err-owner-only (err u2300))
(define-constant err-not-found (err u2301))
(define-constant err-already-registered (err u2302))

(define-data-var registry-owner principal tx-sender)
(define-data-var next-vault-id uint u1)

(define-map vaults
  { vault-id: uint }
  {
    vault-contract: principal,
    strategy-id: uint,
    enabled: bool,
    metadata-uri: (string-ascii 256)
  }
)

(define-map vault-id-by-contract
  { vault-contract: principal }
  { vault-id: uint }
)

(define-public (register-vault (vault-contract principal) (strategy-id uint) (metadata-uri (string-ascii 256)))
  (let ((vault-id (var-get next-vault-id)))
    (begin
      (asserts! (is-eq tx-sender (var-get registry-owner)) err-owner-only)
      (asserts! (is-none (map-get? vault-id-by-contract { vault-contract: vault-contract })) err-already-registered)
      (map-set vaults
        { vault-id: vault-id }
        {
          vault-contract: vault-contract,
          strategy-id: strategy-id,
          enabled: true,
          metadata-uri: metadata-uri
        }
      )
      (map-set vault-id-by-contract { vault-contract: vault-contract } { vault-id: vault-id })
      (var-set next-vault-id (+ vault-id u1))
      (ok vault-id)
    )
  )
)

(define-public (set-vault-enabled (vault-id uint) (enabled bool))
  (begin
    (asserts! (is-eq tx-sender (var-get registry-owner)) err-owner-only)
    (match (map-get? vaults { vault-id: vault-id })
      vault-entry
        (begin
          (map-set vaults
            { vault-id: vault-id }
            {
              vault-contract: (get vault-contract vault-entry),
              strategy-id: (get strategy-id vault-entry),
              enabled: enabled,
              metadata-uri: (get metadata-uri vault-entry)
            }
          )
          (ok true)
        )
      err-not-found
    )
  )
)

(define-public (update-vault-metadata (vault-id uint) (metadata-uri (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender (var-get registry-owner)) err-owner-only)
    (match (map-get? vaults { vault-id: vault-id })
      vault-entry
        (begin
          (map-set vaults
            { vault-id: vault-id }
            {
              vault-contract: (get vault-contract vault-entry),
              strategy-id: (get strategy-id vault-entry),
              enabled: (get enabled vault-entry),
              metadata-uri: metadata-uri
            }
          )
          (ok true)
        )
      err-not-found
    )
  )
)

(define-read-only (get-vault (vault-id uint))
  (map-get? vaults { vault-id: vault-id })
)
