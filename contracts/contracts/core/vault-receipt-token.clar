;; @title V-Mind Vault Receipt Token
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice SIP-010 vault receipt token scaffold for vault share accounting.

(impl-trait .sip-010-ft-trait.sip-010-ft-trait)

(define-fungible-token v-mind-vault-share-token)

(define-constant err-not-token-owner (err u2800))

(define-data-var token-name (string-ascii 32) "V-Mind Vault Share")
(define-data-var token-symbol (string-ascii 32) "vSHARE")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)

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