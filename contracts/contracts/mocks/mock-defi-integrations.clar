;; MOCK CONTRACT - FOR LOCAL TESTING ONLY. NOT FOR DEPLOYMENT.
;; @title Mock DeFi Integrations
;; @version 2026-04-10 added deterministic failure toggles and reconciliation safety banner
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Test adapter implementing Zest, ALEX, StackingDAO, and Hermetica integration traits.

(define-constant protocol-zest u1)
(define-constant protocol-alex u2)
(define-constant protocol-stackingdao u3)
(define-constant protocol-hermetica u4)

(define-constant err-insufficient-liquidity (err u3300))
(define-constant err-forced-failure (err u3301))

(define-data-var force-failure bool false)
(define-data-var total-fees-collected uint u0)

(define-map positions
  {
    vault-id: uint,
    protocol-id: uint
  }
  {
    amount: uint
  }
)

(define-private (get-position (vault-id uint) (protocol-id uint))
  (default-to u0 (get amount (map-get? positions { vault-id: vault-id, protocol-id: protocol-id })))
)

(define-private (assert-not-forced-failure)
  (if (var-get force-failure)
    err-forced-failure
    (ok true)
  )
)

(define-private (deposit-position (vault-id uint) (protocol-id uint) (amount uint))
  (begin
    (try! (assert-not-forced-failure))
    (map-set positions
      { vault-id: vault-id, protocol-id: protocol-id }
      { amount: (+ (get-position vault-id protocol-id) amount) }
    )
    (ok (get-position vault-id protocol-id))
  )
)

(define-private (withdraw-position (vault-id uint) (protocol-id uint) (amount uint))
  (let ((current (get-position vault-id protocol-id)))
    (begin
      (try! (assert-not-forced-failure))
      (asserts! (>= current amount) err-insufficient-liquidity)
      (map-set positions
        { vault-id: vault-id, protocol-id: protocol-id }
        { amount: (- current amount) }
      )
      (ok amount)
    )
  )
)

(define-private (collect-fee (amount uint) (treasury principal))
  (begin
    (try! (assert-not-forced-failure))
    (var-set total-fees-collected (+ (var-get total-fees-collected) amount))
    (ok true)
  )
)

(define-private (exit-position (vault-id uint) (protocol-id uint))
  (let ((amount (get-position vault-id protocol-id)))
    (begin
      (try! (assert-not-forced-failure))
      (map-set positions { vault-id: vault-id, protocol-id: protocol-id } { amount: u0 })
      (ok amount)
    )
  )
)

(define-public (set-force-failure (value bool))
  (ok (var-set force-failure value))
)

(define-public (deposit-to-zest (vault-id uint) (amount uint))
  (deposit-position vault-id protocol-zest amount)
)

(define-public (withdraw-from-zest (vault-id uint) (amount uint))
  (withdraw-position vault-id protocol-zest amount)
)

(define-public (collect-zest-fee (amount uint) (treasury principal))
  (collect-fee amount treasury)
)

(define-public (emergency-exit-zest (vault-id uint))
  (exit-position vault-id protocol-zest)
)

(define-public (provide-alex-liquidity (vault-id uint) (amount uint))
  (deposit-position vault-id protocol-alex amount)
)

(define-public (withdraw-alex-liquidity (vault-id uint) (amount uint))
  (withdraw-position vault-id protocol-alex amount)
)

(define-public (collect-alex-fee (amount uint) (treasury principal))
  (collect-fee amount treasury)
)

(define-public (emergency-exit-alex (vault-id uint))
  (exit-position vault-id protocol-alex)
)

(define-public (mint-ststx (vault-id uint) (amount uint))
  (deposit-position vault-id protocol-stackingdao amount)
)

(define-public (redeem-ststx (vault-id uint) (amount uint))
  (withdraw-position vault-id protocol-stackingdao amount)
)

(define-public (collect-stackingdao-fee (amount uint) (treasury principal))
  (collect-fee amount treasury)
)

(define-public (emergency-exit-stackingdao (vault-id uint))
  (exit-position vault-id protocol-stackingdao)
)

(define-public (deposit-usdh (vault-id uint) (amount uint))
  (deposit-position vault-id protocol-hermetica amount)
)

(define-public (withdraw-usdh (vault-id uint) (amount uint))
  (withdraw-position vault-id protocol-hermetica amount)
)

(define-public (collect-hermetica-fee (amount uint) (treasury principal))
  (collect-fee amount treasury)
)

(define-public (emergency-exit-hermetica (vault-id uint))
  (exit-position vault-id protocol-hermetica)
)

(define-read-only (get-position-amount (vault-id uint) (protocol-id uint))
  (ok (get-position vault-id protocol-id))
)

(define-read-only (get-total-fees-collected)
  (ok (var-get total-fees-collected))
)
