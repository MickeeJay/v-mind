;; @title V-Mind Strategy Execution Engine
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Executes approved vault strategies against supported external DeFi integrations.
;; @dev Handles cooldown enforcement, execution audit state, protocol fee accounting, rebalance, and emergency exits.

(use-trait zest-lending-trait .zest-lending-trait.zest-lending-trait)
(use-trait alex-liquidity-trait .alex-liquidity-trait.alex-liquidity-trait)
(use-trait stackingdao-ststx-trait .stackingdao-ststx-trait.stackingdao-ststx-trait)
(use-trait hermetica-usdh-trait .hermetica-usdh-trait.hermetica-usdh-trait)

(define-constant bps-denominator u10000)

(define-constant role-owner u1)
(define-constant role-strategy-executor u2)

(define-constant vault-status-active u1)

(define-constant protocol-zest u1)
(define-constant protocol-alex u2)
(define-constant protocol-stackingdao u3)
(define-constant protocol-hermetica u4)

(define-constant err-executor-only (err u2600))
(define-constant err-owner-only (err u2601))
(define-constant err-vault-not-found (err u2602))
(define-constant err-vault-not-active (err u2603))
(define-constant err-strategy-mismatch (err u2604))
(define-constant err-strategy-inactive (err u2605))
(define-constant err-cooldown-active (err u2606))
(define-constant err-invalid-amount (err u2607))
(define-constant err-invalid-protocol (err u2608))
(define-constant err-insufficient-position (err u2609))
(define-constant err-invalid-weight-split (err u2610))

(define-map vault-execution-state
  { vault-id: uint }
  {
    last-executed-block: uint,
    last-executed-burn-block: uint,
    total-executions: uint,
    cumulative-fees-collected: uint,
    total-yield-reported: uint
  }
)

(define-map vault-strategy-positions
  {
    vault-id: uint,
    protocol-id: uint
  }
  {
    allocated-assets: uint
  }
)

(define-private (is-protocol-owner (caller principal))
  (or
    (contract-call? .access-control has-role caller role-owner)
    (is-eq caller (contract-call? .access-control get-owner))
  )
)

(define-private (assert-strategy-executor)
  (if
    (or
      (contract-call? .access-control has-role tx-sender role-strategy-executor)
      (is-protocol-owner tx-sender)
    )
    (ok true)
    err-executor-only
  )
)

(define-private (assert-owner)
  (if (is-protocol-owner tx-sender)
    (ok true)
    err-owner-only
  )
)

(define-private (is-supported-protocol (protocol-id uint))
  (or
    (is-eq protocol-id protocol-zest)
    (is-eq protocol-id protocol-alex)
    (is-eq protocol-id protocol-stackingdao)
    (is-eq protocol-id protocol-hermetica)
  )
)

(define-private (get-execution-state-or-default (vault-id uint))
  (default-to
    {
      last-executed-block: u0,
      last-executed-burn-block: u0,
      total-executions: u0,
      cumulative-fees-collected: u0,
      total-yield-reported: u0
    }
    (map-get? vault-execution-state { vault-id: vault-id })
  )
)

(define-private (get-position-or-default (vault-id uint) (protocol-id uint))
  (default-to
    { allocated-assets: u0 }
    (map-get? vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id })
  )
)

(define-private (assert-cooldown-and-strategy (vault-id uint) (strategy-id uint))
  (match (contract-call? .strategy-vault get-vault vault-id)
    vault-entry
      (let
        (
          (vault-strategy-id (get strategy-id vault-entry))
          (vault-status (get vault-status vault-entry))
          (vault-last-block (get last-execution-block vault-entry))
          (exec-state (get-execution-state-or-default vault-id))
          (cooldown-blocks (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
          (effective-last-block (if (> (get total-executions exec-state) u0) (get last-executed-block exec-state) vault-last-block))
        )
        (begin
          (asserts! (is-eq vault-status vault-status-active) err-vault-not-active)
          (asserts! (is-eq strategy-id vault-strategy-id) err-strategy-mismatch)
          (asserts! (contract-call? .strategy-registry is-strategy-active strategy-id) err-strategy-inactive)
          (asserts! (>= block-height (+ effective-last-block cooldown-blocks)) err-cooldown-active)
          (ok true)
        )
      )
    err-vault-not-found
  )
)

(define-private (calculate-performance-fee (yield-generated uint))
  (/ (* yield-generated (contract-call? .protocol-config get-protocol-performance-fee-bps)) bps-denominator)
)

(define-private (deposit-into-protocol
  (protocol-id uint)
  (vault-id uint)
  (amount uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (if (is-eq protocol-id protocol-zest)
    (contract-call? zest deposit-to-zest vault-id amount)
    (if (is-eq protocol-id protocol-alex)
      (contract-call? alex provide-alex-liquidity vault-id amount)
      (if (is-eq protocol-id protocol-stackingdao)
        (contract-call? stackingdao mint-ststx vault-id amount)
        (if (is-eq protocol-id protocol-hermetica)
          (contract-call? hermetica deposit-usdh vault-id amount)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (withdraw-from-protocol
  (protocol-id uint)
  (vault-id uint)
  (amount uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (if (is-eq protocol-id protocol-zest)
    (contract-call? zest withdraw-from-zest vault-id amount)
    (if (is-eq protocol-id protocol-alex)
      (contract-call? alex withdraw-alex-liquidity vault-id amount)
      (if (is-eq protocol-id protocol-stackingdao)
        (contract-call? stackingdao redeem-ststx vault-id amount)
        (if (is-eq protocol-id protocol-hermetica)
          (contract-call? hermetica withdraw-usdh vault-id amount)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (collect-protocol-fee
  (protocol-id uint)
  (fee-amount uint)
  (treasury principal)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (if (is-eq protocol-id protocol-zest)
    (contract-call? zest collect-zest-fee fee-amount treasury)
    (if (is-eq protocol-id protocol-alex)
      (contract-call? alex collect-alex-fee fee-amount treasury)
      (if (is-eq protocol-id protocol-stackingdao)
        (contract-call? stackingdao collect-stackingdao-fee fee-amount treasury)
        (if (is-eq protocol-id protocol-hermetica)
          (contract-call? hermetica collect-hermetica-fee fee-amount treasury)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (emergency-exit-protocol
  (protocol-id uint)
  (vault-id uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (if (is-eq protocol-id protocol-zest)
    (contract-call? zest emergency-exit-zest vault-id)
    (if (is-eq protocol-id protocol-alex)
      (contract-call? alex emergency-exit-alex vault-id)
      (if (is-eq protocol-id protocol-stackingdao)
        (contract-call? stackingdao emergency-exit-stackingdao vault-id)
        (if (is-eq protocol-id protocol-hermetica)
          (contract-call? hermetica emergency-exit-hermetica vault-id)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (write-execution-state (vault-id uint) (fee-collected uint) (yield-generated uint))
  (let ((existing (get-execution-state-or-default vault-id)))
    (map-set vault-execution-state
      { vault-id: vault-id }
      {
        last-executed-block: block-height,
        last-executed-burn-block: burn-block-height,
        total-executions: (+ (get total-executions existing) u1),
        cumulative-fees-collected: (+ (get cumulative-fees-collected existing) fee-collected),
        total-yield-reported: (+ (get total-yield-reported existing) yield-generated)
      }
    )
  )
)

(define-public (execute-strategy
  (vault-id uint)
  (strategy-id uint)
  (protocol-id uint)
  (asset-amount uint)
  (yield-generated uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-strategy-executor))
    (asserts! (> asset-amount u0) err-invalid-amount)
    (asserts! (is-supported-protocol protocol-id) err-invalid-protocol)
    (try! (assert-cooldown-and-strategy vault-id strategy-id))
    (try! (deposit-into-protocol protocol-id vault-id asset-amount zest alex stackingdao hermetica))
    (let
      (
        (fee-amount (calculate-performance-fee yield-generated))
        (net-yield (if (>= yield-generated fee-amount) (- yield-generated fee-amount) u0))
        (position (get-position-or-default vault-id protocol-id))
        (treasury (contract-call? .protocol-config get-protocol-treasury))
      )
      (begin
        (if (> fee-amount u0)
          (try! (collect-protocol-fee protocol-id fee-amount treasury zest alex stackingdao hermetica))
          true
        )
        (map-set vault-strategy-positions
          { vault-id: vault-id, protocol-id: protocol-id }
          { allocated-assets: (+ (+ (get allocated-assets position) asset-amount) net-yield) }
        )
        (write-execution-state vault-id fee-amount yield-generated)
        (print {
          event: "strategy-executed",
          vault-id: vault-id,
          strategy-id: strategy-id,
          protocol-id: protocol-id,
          executor: tx-sender,
          asset-amount: asset-amount,
          yield-generated: yield-generated,
          fee-collected: fee-amount,
          treasury: treasury,
          cooldown-blocks: (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks),
          execution-block: block-height,
          execution-burn-block: burn-block-height
        })
        (ok {
          vault-id: vault-id,
          protocol-id: protocol-id,
          strategy-id: strategy-id,
          deployed-amount: asset-amount,
          fee-collected: fee-amount,
          net-yield: net-yield,
          execution-block: block-height
        })
      )
    )
  )
)

(define-public (rebalance-vault
  (vault-id uint)
  (strategy-id uint)
  (from-protocol-id uint)
  (to-protocol-id uint)
  (rebalance-amount uint)
  (from-target-weight-bps uint)
  (to-target-weight-bps uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-strategy-executor))
    (asserts! (> rebalance-amount u0) err-invalid-amount)
    (asserts! (is-supported-protocol from-protocol-id) err-invalid-protocol)
    (asserts! (is-supported-protocol to-protocol-id) err-invalid-protocol)
    (asserts! (not (is-eq from-protocol-id to-protocol-id)) err-invalid-protocol)
    (asserts! (is-eq (+ from-target-weight-bps to-target-weight-bps) bps-denominator) err-invalid-weight-split)
    (try! (assert-cooldown-and-strategy vault-id strategy-id))
    (let
      (
        (from-position (get-position-or-default vault-id from-protocol-id))
        (to-position (get-position-or-default vault-id to-protocol-id))
      )
      (begin
        (asserts! (>= (get allocated-assets from-position) rebalance-amount) err-insufficient-position)
        (try! (withdraw-from-protocol from-protocol-id vault-id rebalance-amount zest alex stackingdao hermetica))
        (try! (deposit-into-protocol to-protocol-id vault-id rebalance-amount zest alex stackingdao hermetica))
        (map-set vault-strategy-positions
          { vault-id: vault-id, protocol-id: from-protocol-id }
          { allocated-assets: (- (get allocated-assets from-position) rebalance-amount) }
        )
        (map-set vault-strategy-positions
          { vault-id: vault-id, protocol-id: to-protocol-id }
          { allocated-assets: (+ (get allocated-assets to-position) rebalance-amount) }
        )
        (write-execution-state vault-id u0 u0)
        (print {
          event: "vault-rebalanced",
          vault-id: vault-id,
          strategy-id: strategy-id,
          executor: tx-sender,
          from-protocol-id: from-protocol-id,
          to-protocol-id: to-protocol-id,
          amount: rebalance-amount,
          from-target-weight-bps: from-target-weight-bps,
          to-target-weight-bps: to-target-weight-bps,
          from-remaining-assets: (- (get allocated-assets from-position) rebalance-amount),
          to-resulting-assets: (+ (get allocated-assets to-position) rebalance-amount),
          cooldown-blocks: (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks),
          execution-block: block-height
        })
        (ok true)
      )
    )
  )
)

(define-public (emergency-exit-vault
  (vault-id uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-owner))
    (let
      (
        (zest-assets (try! (emergency-exit-protocol protocol-zest vault-id zest alex stackingdao hermetica)))
        (alex-assets (try! (emergency-exit-protocol protocol-alex vault-id zest alex stackingdao hermetica)))
        (stackingdao-assets (try! (emergency-exit-protocol protocol-stackingdao vault-id zest alex stackingdao hermetica)))
        (hermetica-assets (try! (emergency-exit-protocol protocol-hermetica vault-id zest alex stackingdao hermetica)))
        (total-returned (+ (+ zest-assets alex-assets) (+ stackingdao-assets hermetica-assets)))
      )
      (begin
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-zest } { allocated-assets: u0 })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-alex } { allocated-assets: u0 })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-stackingdao } { allocated-assets: u0 })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-hermetica } { allocated-assets: u0 })
        (print {
          event: "vault-emergency-exit",
          vault-id: vault-id,
          caller: tx-sender,
          bypassed-cooldown: true,
          returned-zest-assets: zest-assets,
          returned-alex-assets: alex-assets,
          returned-stackingdao-assets: stackingdao-assets,
          returned-hermetica-assets: hermetica-assets,
          total-returned-assets: total-returned,
          execution-block: block-height
        })
        (ok total-returned)
      )
    )
  )
)

(define-read-only (get-vault-execution-state (vault-id uint))
  (map-get? vault-execution-state { vault-id: vault-id })
)

(define-read-only (get-vault-position (vault-id uint) (protocol-id uint))
  (map-get? vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id })
)

(define-read-only (get-cooldown-blocks)
  (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks)
)

(define-read-only (get-performance-fee-bps)
  (contract-call? .protocol-config get-protocol-performance-fee-bps)
)

(define-read-only (is-protocol-supported (protocol-id uint))
  (is-supported-protocol protocol-id)
)

(define-read-only (get-next-executable-block (vault-id uint))
  (match (contract-call? .strategy-vault get-vault vault-id)
    vault-entry
      (let
        (
          (exec-state (get-execution-state-or-default vault-id))
          (cooldown-blocks (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
          (effective-last-block (if (> (get total-executions exec-state) u0) (get last-executed-block exec-state) (get last-execution-block vault-entry)))
        )
        (ok (+ effective-last-block cooldown-blocks))
      )
    err-vault-not-found
  )
)

(define-read-only (get-total-allocated-assets (vault-id uint))
  (let
    (
      (zest-assets (get allocated-assets (get-position-or-default vault-id protocol-zest)))
      (alex-assets (get allocated-assets (get-position-or-default vault-id protocol-alex)))
      (stackingdao-assets (get allocated-assets (get-position-or-default vault-id protocol-stackingdao)))
      (hermetica-assets (get allocated-assets (get-position-or-default vault-id protocol-hermetica)))
    )
    (ok (+ (+ zest-assets alex-assets) (+ stackingdao-assets hermetica-assets)))
  )
)
