;; V-Mind Core Contract
;; Main contract for DeFi strategy automation
;; Access patterns:
;; - pause-contract (owner-only)
;; - unpause-contract (owner-only)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))

;; Data Variables
(define-data-var contract-paused bool false)

;; Public Functions
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (var-set contract-paused true))
  )
)

(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (var-set contract-paused false))
  )
)

;; Read-only Functions
(define-read-only (is-paused)
  (var-get contract-paused)
)

(define-read-only (get-contract-owner)
  contract-owner
)
