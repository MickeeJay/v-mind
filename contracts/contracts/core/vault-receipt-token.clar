;; @title V-Mind Vault Receipt Token
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice SIP-010 vault receipt token scaffold for vault share accounting.

(impl-trait .sip-010-ft-trait.sip-010-ft-trait)

(define-fungible-token v-mind-vault-share-token)

(define-constant err-not-token-owner (err u2800))
(define-constant err-owner-only (err u2801))
(define-constant err-already-initialized (err u2802))
(define-constant err-invalid-decimals (err u2803))

(define-constant max-token-decimals u18)

(define-data-var contract-owner principal tx-sender)
(define-data-var initialized bool false)
(define-data-var vault-core-contract principal tx-sender)

(define-data-var token-name (string-ascii 32) "V-Mind Vault Share")
(define-data-var token-symbol (string-ascii 32) "vSHARE")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)

(define-private (assert-owner)
  (if (is-eq tx-sender (var-get contract-owner))
    (ok true)
    err-owner-only
  )
)

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

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (try! (ft-transfer? v-mind-vault-share-token amount sender recipient))
    (match memo memo-value (print memo-value) false)
    (ok true)
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