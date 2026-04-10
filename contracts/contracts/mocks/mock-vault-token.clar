;; MOCK CONTRACT - FOR LOCAL TESTING ONLY. NOT FOR DEPLOYMENT.
;; @title Mock Vault Token
;; @version 2026-04-10 added deterministic failure toggles and reconciliation safety banner
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Test-only receipt token implementation for vault-core accounting tests.
;; @dev Mimics vault-token-trait methods with in-contract balance storage.
;; @contract mock-vault-token
;; @constants
;; - err-insufficient-balance: Returned when burn or transfer exceeds account balance.
;; @data-vars
;; - total-supply: Total shares minted by mock token.
;; @maps
;; - balances: Principal to share balance mapping.
;; @public-functions
;; - mint: Mints new shares to account.
;; - burn: Burns shares from account.
;; - transfer: Moves shares between accounts.
;; - get-balance: Reads account share balance.
;; - get-total-supply: Reads total supply.
;; @external-contracts
;; - Used by vault-core tests.
;; @limitations
;; - No operator approvals or metadata fields are implemented.

(define-constant err-insufficient-balance (err u3100))
(define-constant err-forced-failure (err u3101))
(define-constant one-6 u1000000)

(define-data-var total-supply uint u0)
(define-data-var force-failure bool false)

(define-map balances
  { vault-id: uint, account: principal }
  { amount: uint }
)

(define-map vault-supply
  { vault-id: uint }
  { amount: uint }
)

(define-private (get-vault-balance-internal (vault-id uint) (account principal))
  (default-to u0 (get amount (map-get? balances { vault-id: vault-id, account: account })))
)

(define-private (get-vault-supply-internal (vault-id uint))
  (default-to u0 (get amount (map-get? vault-supply { vault-id: vault-id })))
)

(define-public (set-force-failure (enabled bool))
  (ok (var-set force-failure enabled))
)

(define-public (mint (vault-id uint) (recipient principal) (amount uint))
  (if (var-get force-failure)
    err-forced-failure
    (begin
      (map-set balances { vault-id: vault-id, account: recipient } { amount: (+ (get-vault-balance-internal vault-id recipient) amount) })
      (map-set vault-supply { vault-id: vault-id } { amount: (+ (get-vault-supply-internal vault-id) amount) })
      (var-set total-supply (+ (var-get total-supply) amount))
      (ok amount)
    )
  )
)

(define-public (burn (vault-id uint) (holder principal) (amount uint))
  (if (var-get force-failure)
    err-forced-failure
    (let ((balance (get-vault-balance-internal vault-id holder)))
      (begin
        (asserts! (>= balance amount) err-insufficient-balance)
        (map-set balances { vault-id: vault-id, account: holder } { amount: (- balance amount) })
        (map-set vault-supply { vault-id: vault-id } { amount: (- (get-vault-supply-internal vault-id) amount) })
        (var-set total-supply (- (var-get total-supply) amount))
        (ok amount)
      )
    )
  )
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (if (var-get force-failure)
    err-forced-failure
    (let
      (
        (vault-id u1)
        (sender-balance (get-vault-balance-internal vault-id sender))
      )
      (begin
        (asserts! (>= sender-balance amount) err-insufficient-balance)
        (map-set balances { vault-id: vault-id, account: sender } { amount: (- sender-balance amount) })
        (map-set balances { vault-id: vault-id, account: recipient } { amount: (+ (get-vault-balance-internal vault-id recipient) amount) })
        (ok true)
      )
    )
  )
)

(define-read-only (get-name)
  (ok "Mock Vault Share")
)

(define-read-only (get-symbol)
  (ok "MVSH")
)

(define-read-only (get-decimals)
  (ok u6)
)

(define-read-only (get-balance (owner principal))
  (ok (get-vault-balance-internal u1 owner))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-token-uri)
  (ok none)
)

(define-read-only (get-vault-balance (vault-id uint) (owner principal))
  (ok (get-vault-balance-internal vault-id owner))
)

(define-read-only (get-vault-total-supply (vault-id uint))
  (ok (get-vault-supply-internal vault-id))
)

(define-read-only (get-price-per-share (vault-id uint))
  (ok one-6)
)
