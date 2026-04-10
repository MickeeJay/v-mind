;; @title Mock Vault Token
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

(define-data-var total-supply uint u0)

(define-map balances
  { account: principal }
  { amount: uint }
)

(define-private (get-balance-internal (account principal))
  (default-to u0 (get amount (map-get? balances { account: account })))
)

(define-public (mint (recipient principal) (amount uint))
  (begin
    (map-set balances { account: recipient } { amount: (+ (get-balance-internal recipient) amount) })
    (var-set total-supply (+ (var-get total-supply) amount))
    (ok true)
  )
)

(define-public (burn (holder principal) (amount uint))
  (let ((balance (get-balance-internal holder)))
    (begin
      (asserts! (>= balance amount) err-insufficient-balance)
      (map-set balances { account: holder } { amount: (- balance amount) })
      (var-set total-supply (- (var-get total-supply) amount))
      (ok true)
    )
  )
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (let ((sender-balance (get-balance-internal sender)))
    (begin
      (asserts! (>= sender-balance amount) err-insufficient-balance)
      (map-set balances { account: sender } { amount: (- sender-balance amount) })
      (map-set balances { account: recipient } { amount: (+ (get-balance-internal recipient) amount) })
      (ok true)
    )
  )
)

(define-read-only (get-balance (owner principal))
  (ok (get-balance-internal owner))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)
