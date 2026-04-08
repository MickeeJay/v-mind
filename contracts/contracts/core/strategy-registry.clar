;; @title V-Mind Strategy Registry
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Registry of approved strategy contracts and their configuration metadata.
;; @dev Vaults and frontends query this contract to resolve active strategies and constraints.
;; @contract strategy-registry
;; @constants
;; - err-owner-only: Returned when caller is not registry owner.
;; - err-already-registered: Returned when a strategy ID already exists.
;; - err-not-found: Returned when strategy ID is unknown.
;; @data-vars
;; - registry-owner: Principal with authority to register and disable strategies.
;; - next-strategy-id: Auto-incrementing strategy identifier counter.
;; @maps
;; - strategies: Stores strategy contract principal, status, and metadata fields keyed by strategy ID.
;; @public-functions
;; - register-strategy: Registers a new strategy contract and metadata.
;; - set-strategy-enabled: Enables or disables an existing strategy.
;; - update-strategy-metadata: Updates display metadata and risk score.
;; @external-contracts
;; - Depends on: access-control, protocol-config, strategy-validation-lib (planned integration).
;; - Consumed by: vault-registry, strategy-vault, off-chain indexers.
;; @limitations
;; - Strategy contract trait compliance checks are not yet enforced in this scaffold.

(define-constant err-owner-only (err u2200))
(define-constant err-already-registered (err u2201))
(define-constant err-not-found (err u2202))

(define-constant strategy-type-yield u1)
(define-constant strategy-type-rebalance u2)
(define-constant strategy-type-dca u3)
(define-constant strategy-type-exit u4)

(define-data-var registry-owner principal tx-sender)
(define-data-var next-strategy-id uint u1)

(define-map strategies
  { strategy-id: uint }
  {
    strategy-contract: principal,
    enabled: bool,
    metadata-uri: (string-ascii 256),
    risk-score: uint
  }
)

(define-public (register-strategy (strategy-contract principal) (metadata-uri (string-ascii 256)) (risk-score uint))
  (let ((strategy-id (var-get next-strategy-id)))
    (begin
      (asserts! (is-eq tx-sender (var-get registry-owner)) err-owner-only)
      (asserts! (is-none (map-get? strategies { strategy-id: strategy-id })) err-already-registered)
      (map-set strategies
        { strategy-id: strategy-id }
        {
          strategy-contract: strategy-contract,
          enabled: true,
          metadata-uri: metadata-uri,
          risk-score: risk-score
        }
      )
      (var-set next-strategy-id (+ strategy-id u1))
      (ok strategy-id)
    )
  )
)

(define-public (set-strategy-enabled (strategy-id uint) (enabled bool))
  (begin
    (asserts! (is-eq tx-sender (var-get registry-owner)) err-owner-only)
    (match (map-get? strategies { strategy-id: strategy-id })
      strategy-entry
        (begin
          (map-set strategies
            { strategy-id: strategy-id }
            {
              strategy-contract: (get strategy-contract strategy-entry),
              enabled: enabled,
              metadata-uri: (get metadata-uri strategy-entry),
              risk-score: (get risk-score strategy-entry)
            }
          )
          (ok true)
        )
      err-not-found
    )
  )
)

(define-public (update-strategy-metadata (strategy-id uint) (metadata-uri (string-ascii 256)) (risk-score uint))
  (begin
    (asserts! (is-eq tx-sender (var-get registry-owner)) err-owner-only)
    (match (map-get? strategies { strategy-id: strategy-id })
      strategy-entry
        (begin
          (map-set strategies
            { strategy-id: strategy-id }
            {
              strategy-contract: (get strategy-contract strategy-entry),
              enabled: (get enabled strategy-entry),
              metadata-uri: metadata-uri,
              risk-score: risk-score
            }
          )
          (ok true)
        )
      err-not-found
    )
  )
)

(define-read-only (get-strategy (strategy-id uint))
  (map-get? strategies { strategy-id: strategy-id })
)
