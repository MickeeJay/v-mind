;; @title V-Mind Vault Receipt Token
;; @version 2026-04-10-B fixes:
;;   C-4  Self-transfer causes ft-transfer? ERR-3 - now rejected with err-self-transfer before ft-transfer?.
;;   C-5  sync-vault-assets supply invariant was tautologically always true - removed; meaningful
;;        cross-check replaced by callers (assert-vault-assets-synced in vault-core).
;;   H-3  unwrap-panic in mint/burn replaced with unwrap! + err-invalid-amount.
;;   H-4  Missing err-insufficient-vault-assets constant added (u2808).
;; @author V-Mind Core Team
;; @notice SIP-010 vault receipt token for vault share accounting.
;; @contract vault-receipt-token

(impl-trait .sip-010-ft-trait.sip-010-ft-trait)
(impl-trait .vault-token-trait.vault-token-trait)

(define-fungible-token v-mind-vault-share-token)

(define-constant err-not-token-owner (err u2800))
(define-constant err-owner-only (err u2801))
(define-constant err-already-initialized (err u2802))
(define-constant err-invalid-decimals (err u2803))
(define-constant err-vault-core-only (err u2804))
(define-constant err-invalid-amount (err u2805))
(define-constant err-insufficient-vault-shares (err u2806))
(define-constant err-vault-context-required (err u2807))
(define-constant err-insufficient-vault-assets (err u2808))
(define-constant err-supply-invariant (err u2809))
(define-constant err-self-transfer (err u2810))

(define-constant max-token-decimals u18)
(define-constant share-scaling-factor u1000000)
(define-constant initial-price-per-share u1000000)

(define-data-var contract-owner principal tx-sender)
(define-data-var initialized bool false)
(define-data-var vault-core-contract principal tx-sender)

(define-data-var token-name (string-ascii 32) "V-Mind Vault Share")
(define-data-var token-symbol (string-ascii 32) "vSHARE")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)

(define-map vault-share-balances
  {
    vault-id: uint,
    account: principal
  }
  {
    amount: uint
  }
)

(define-map vault-share-supplies
  { vault-id: uint }
  { total-shares: uint }
)

(define-map vault-total-assets
  { vault-id: uint }
  { total-assets: uint }
)

(define-map account-active-vault-count
  { account: principal }
  { count: uint }
)

(define-map account-primary-vault
  { account: principal }
  { vault-id: uint }
)

(define-private (get-vault-balance-internal (vault-id uint) (account principal))
  (default-to u0 (get amount (map-get? vault-share-balances { vault-id: vault-id, account: account })))
)

(define-private (get-vault-total-supply-internal (vault-id uint))
  (default-to u0 (get total-shares (map-get? vault-share-supplies { vault-id: vault-id })))
)

(define-private (get-vault-total-assets-internal (vault-id uint))
  (default-to u0 (get total-assets (map-get? vault-total-assets { vault-id: vault-id })))
)

(define-private (get-account-active-vault-count-internal (account principal))
  (default-to u0 (get count (map-get? account-active-vault-count { account: account })))
)

(define-private (get-account-primary-vault-internal (account principal))
  (default-to u0 (get vault-id (map-get? account-primary-vault { account: account })))
)

(define-private (assert-owner)
  (if (is-eq tx-sender (var-get contract-owner))
    (ok true)
    err-owner-only
  )
)

(define-private (assert-vault-core)
  (if (is-eq contract-caller (var-get vault-core-contract))
    (ok true)
    err-vault-core-only
  )
)

;; Access pattern: owner-only
(define-public (initialize-token
  (vault-core principal)
  (name (string-ascii 32))
  (symbol (string-ascii 32))
  (decimals uint)
  (uri (optional (string-utf8 256)))
)
  (begin
    (try! (assert-owner))
    (asserts! (not (var-get initialized)) err-already-initialized)
    (asserts! (<= decimals max-token-decimals) err-invalid-decimals)
    (var-set vault-core-contract vault-core)
    (var-set token-name name)
    (var-set token-symbol symbol)
    (var-set token-decimals decimals)
    (var-set token-uri uri)
    (var-set initialized true)
    (ok true)
  )
)

;; Access pattern: token-owner-only
;; FIX C-4: self-transfer is now explicitly rejected with err-self-transfer.
;;           The prior code branched on (is-eq sender recipient) and called ft-transfer? with the
;;           same principal for both ends - Clarity returns (err u3) on that path, causing a panic.
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (not (is-eq sender recipient)) err-self-transfer)
    (let
      (
        (sender-active-vault-count (get-account-active-vault-count-internal sender))
        (sender-vault-id (get-account-primary-vault-internal sender))
        (sender-vault-balance (get-vault-balance-internal sender-vault-id sender))
        (recipient-vault-balance (get-vault-balance-internal sender-vault-id recipient))
        (recipient-active-vault-count (get-account-active-vault-count-internal recipient))
      )
      (begin
        (asserts! (is-eq sender-active-vault-count u1) err-vault-context-required)
        (asserts! (> sender-vault-id u0) err-vault-context-required)
        (asserts! (>= sender-vault-balance amount) err-insufficient-vault-shares)
        (try! (ft-transfer? v-mind-vault-share-token amount sender recipient))
        (map-set vault-share-balances
          { vault-id: sender-vault-id, account: sender }
          { amount: (- sender-vault-balance amount) }
        )
        (map-set vault-share-balances
          { vault-id: sender-vault-id, account: recipient }
          { amount: (+ recipient-vault-balance amount) }
        )
        (if (is-eq (- sender-vault-balance amount) u0)
          (begin
            (map-set account-active-vault-count { account: sender } { count: u0 })
            (map-set account-primary-vault { account: sender } { vault-id: u0 })
            true
          )
          true
        )
        (if (is-eq recipient-vault-balance u0)
          (begin
            (map-set account-active-vault-count { account: recipient } { count: (+ recipient-active-vault-count u1) })
            (if (is-eq recipient-active-vault-count u0)
              (map-set account-primary-vault { account: recipient } { vault-id: sender-vault-id })
              true
            )
            true
          )
          true
        )
        (match memo memo-value (begin (print memo-value) true) true)
        (ok true)
      )
    )
  )
)

;; Access pattern: vault-core-only
;; FIX H-3: replaced (unwrap-panic (get-price-per-share ...)) with (unwrap! ... err-invalid-amount)
(define-public (mint (vault-id uint) (recipient principal) (deposit-amount uint))
  (begin
    (try! (assert-vault-core))
    (asserts! (> deposit-amount u0) err-invalid-amount)
    (let
      (
        (price-per-share (unwrap! (get-price-per-share vault-id) err-invalid-amount))
        (shares-to-mint (/ (* deposit-amount share-scaling-factor) price-per-share))
        (current-vault-balance (get-vault-balance-internal vault-id recipient))
        (current-vault-supply (get-vault-total-supply-internal vault-id))
        (current-vault-assets (get-vault-total-assets-internal vault-id))
      )
      (begin
        (asserts! (> shares-to-mint u0) err-invalid-amount)
        (try! (ft-mint? v-mind-vault-share-token shares-to-mint recipient))
        (map-set vault-share-balances
          { vault-id: vault-id, account: recipient }
          { amount: (+ current-vault-balance shares-to-mint) }
        )
        (map-set vault-share-supplies
          { vault-id: vault-id }
          { total-shares: (+ current-vault-supply shares-to-mint) }
        )
        (map-set vault-total-assets
          { vault-id: vault-id }
          { total-assets: (+ current-vault-assets deposit-amount) }
        )
        (if (is-eq current-vault-balance u0)
          (let ((active-vault-count (get-account-active-vault-count-internal recipient)))
            (begin
              (map-set account-active-vault-count { account: recipient } { count: (+ active-vault-count u1) })
              (if (is-eq active-vault-count u0)
                (map-set account-primary-vault { account: recipient } { vault-id: vault-id })
                true
              )
              true
            )
          )
          true
        )
        (ok shares-to-mint)
      )
    )
  )
)

;; Access pattern: vault-core-only
;; FIX H-3: replaced (unwrap-panic (get-price-per-share ...)) with (unwrap! ... err-invalid-amount)
(define-public (burn (vault-id uint) (holder principal) (share-amount uint))
  (begin
    (try! (assert-vault-core))
    (asserts! (> share-amount u0) err-invalid-amount)
    (let
      (
        (price-per-share (unwrap! (get-price-per-share vault-id) err-invalid-amount))
        (current-vault-balance (get-vault-balance-internal vault-id holder))
        (current-vault-supply (get-vault-total-supply-internal vault-id))
        (current-vault-assets (get-vault-total-assets-internal vault-id))
        (withdrawn-amount (/ (* share-amount price-per-share) share-scaling-factor))
      )
      (begin
        (asserts! (>= current-vault-balance share-amount) err-insufficient-vault-shares)
        (asserts! (>= current-vault-supply share-amount) err-insufficient-vault-shares)
        (asserts! (>= current-vault-assets withdrawn-amount) err-insufficient-vault-assets)
        (try! (ft-burn? v-mind-vault-share-token share-amount holder))
        (map-set vault-share-balances
          { vault-id: vault-id, account: holder }
          { amount: (- current-vault-balance share-amount) }
        )
        (map-set vault-share-supplies
          { vault-id: vault-id }
          { total-shares: (- current-vault-supply share-amount) }
        )
        (map-set vault-total-assets
          { vault-id: vault-id }
          { total-assets: (- current-vault-assets withdrawn-amount) }
        )
        (if (is-eq (- current-vault-balance share-amount) u0)
          (let
            (
              (active-vault-count (get-account-active-vault-count-internal holder))
              (primary-vault (get-account-primary-vault-internal holder))
            )
            (begin
              (if (> active-vault-count u0)
                (map-set account-active-vault-count { account: holder } { count: (- active-vault-count u1) })
                true
              )
              (if (is-eq primary-vault vault-id)
                (if (<= active-vault-count u1)
                  (map-set account-primary-vault { account: holder } { vault-id: u0 })
                  true
                )
                true
              )
              true
            )
          )
          true
        )
        (ok withdrawn-amount)
      )
    )
  )
)

;; Access pattern: vault-core-only
;; FIX C-5: The previous supply invariant check was tautologically true because sync-vault-assets
;;           only modifies vault-total-assets; reading vault-share-supplies (unchanged) always
;;           matched its own pre-mutation value. The cross-contract invariant is instead enforced by
;;           vault-core's assert-vault-assets-synced after every state-changing call.
(define-public (sync-vault-assets (vault-id uint) (total-assets uint))
  (begin
    (try! (assert-vault-core))
    (map-set vault-total-assets { vault-id: vault-id } { total-assets: total-assets })
    (ok total-assets)
  )
)

(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

(define-read-only (get-balance (owner principal))
  (ok (ft-get-balance v-mind-vault-share-token owner))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply v-mind-vault-share-token))
)

(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

(define-read-only (get-vault-core-contract)
  (var-get vault-core-contract)
)

(define-read-only (is-initialized)
  (var-get initialized)
)

(define-read-only (get-vault-balance (vault-id uint) (owner principal))
  (ok (get-vault-balance-internal vault-id owner))
)

(define-read-only (get-vault-total-supply (vault-id uint))
  (ok (get-vault-total-supply-internal vault-id))
)

(define-read-only (get-vault-total-assets (vault-id uint))
  (ok (get-vault-total-assets-internal vault-id))
)

(define-read-only (get-price-per-share (vault-id uint))
  (let ((vault-share-supply (get-vault-total-supply-internal vault-id)))
    (if (is-eq vault-share-supply u0)
      (ok initial-price-per-share)
      (ok (/ (* (get-vault-total-assets-internal vault-id) share-scaling-factor) vault-share-supply))
    )
  )
)