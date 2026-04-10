;; @title V-Mind Strategy Execution Engine
;; @version 2026-04-10 reconciled dependency wiring, query helpers, and public access-pattern annotations
;; @author V-Mind Core Team
;; @notice Executes approved vault strategies against supported external DeFi integrations.
;; @dev Handles cooldown enforcement, execution audit state, protocol fee accounting, rebalance, and emergency exits.
;; @public-functions
;; - execute-strategy (strategy-executor-or-protocol-owner): Deploys vault assets into a protocol and records fee/yield.
;; - rebalance-vault (strategy-executor-or-protocol-owner): Moves allocation across protocols using validated weight split.
;; - emergency-exit-vault (protocol-owner-only): Forces protocol exits and clears tracked positions.

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

(define-constant vault-core-contract .vault-core)
(define-constant strategy-registry-contract .strategy-registry)
(define-constant protocol-config-contract .protocol-config)

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
(define-constant err-allocation-exceeds-vault-assets (err u2611))

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
  (let
    (
      (vault (unwrap! (contract-call? .vault-core get-vault-for-execution vault-id) err-vault-not-found))
      (vault-status (get vault-status vault))
      (vault-strategy-id (get strategy-id vault))
      (vault-last-block (get last-execution-block vault))
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
)

(define-private (calculate-performance-fee (yield-generated uint))
  (unwrap-panic (contract-call? .vault-accounting-lib compute-performance-fee yield-generated (contract-call? .protocol-config get-protocol-performance-fee-bps)))
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

(define-private (assert-allocation-within-vault-assets (vault-id uint))
  (let
    (
      (zest-assets (get allocated-assets (get-position-or-default vault-id protocol-zest)))
      (alex-assets (get allocated-assets (get-position-or-default vault-id protocol-alex)))
      (stackingdao-assets (get allocated-assets (get-position-or-default vault-id protocol-stackingdao)))
      (hermetica-assets (get allocated-assets (get-position-or-default vault-id protocol-hermetica)))
      (total-allocated (+ (+ zest-assets alex-assets) (+ stackingdao-assets hermetica-assets)))
      (vault-assets (try! (contract-call? .vault-core get-vault-total-assets vault-id)))
    )
    (begin
      (asserts! (<= total-allocated vault-assets) err-allocation-exceeds-vault-assets)
      (ok true)
    )
  )
)

;; Access pattern: strategy-executor-or-protocol-owner
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
    (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
    (let
      (
        (fee-amount (calculate-performance-fee yield-generated))
        (net-yield (if (>= yield-generated fee-amount) (- yield-generated fee-amount) u0))
        (position (get-position-or-default vault-id protocol-id))
        (updated-allocation (+ (+ (get allocated-assets position) asset-amount) net-yield))
        (treasury (contract-call? .protocol-config get-protocol-treasury))
      )
      (begin
        (map-set vault-strategy-positions
          { vault-id: vault-id, protocol-id: protocol-id }
          { allocated-assets: updated-allocation }
        )
        (try! (assert-allocation-within-vault-assets vault-id))
        (try! (deposit-into-protocol protocol-id vault-id asset-amount zest alex stackingdao hermetica))
        (if (> fee-amount u0)
          (try! (collect-protocol-fee protocol-id fee-amount treasury zest alex stackingdao hermetica))
          true
        )
        (write-execution-state vault-id fee-amount yield-generated)
        (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
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

;; Access pattern: strategy-executor-or-protocol-owner
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
    (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
    (let
      (
        (from-position (get-position-or-default vault-id from-protocol-id))
        (to-position (get-position-or-default vault-id to-protocol-id))
      )
      (begin
        (asserts! (>= (get allocated-assets from-position) rebalance-amount) err-insufficient-position)
        (let
          (
            (updated-from-assets (- (get allocated-assets from-position) rebalance-amount))
            (updated-to-assets (+ (get allocated-assets to-position) rebalance-amount))
          )
          (begin
            (map-set vault-strategy-positions
              { vault-id: vault-id, protocol-id: from-protocol-id }
              { allocated-assets: updated-from-assets }
            )
            (map-set vault-strategy-positions
              { vault-id: vault-id, protocol-id: to-protocol-id }
              { allocated-assets: updated-to-assets }
            )
            (try! (assert-allocation-within-vault-assets vault-id))
            (try! (withdraw-from-protocol from-protocol-id vault-id rebalance-amount zest alex stackingdao hermetica))
            (try! (deposit-into-protocol to-protocol-id vault-id rebalance-amount zest alex stackingdao hermetica))
            (write-execution-state vault-id u0 u0)
            (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
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
              from-remaining-assets: updated-from-assets,
              to-resulting-assets: updated-to-assets,
              cooldown-blocks: (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks),
              execution-block: block-height
            })
            (ok true)
          )
        )
      )
    )
  )
)

;; Access pattern: protocol-owner-only
(define-public (emergency-exit-vault
  (vault-id uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-owner))
    (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
    (let
      (
        (zest-position (get-position-or-default vault-id protocol-zest))
        (alex-position (get-position-or-default vault-id protocol-alex))
        (stackingdao-position (get-position-or-default vault-id protocol-stackingdao))
        (hermetica-position (get-position-or-default vault-id protocol-hermetica))
      )
      (begin
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-zest } { allocated-assets: u0 })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-alex } { allocated-assets: u0 })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-stackingdao } { allocated-assets: u0 })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-hermetica } { allocated-assets: u0 })
        (try! (assert-allocation-within-vault-assets vault-id))
        (let
          (
            (zest-assets (try! (emergency-exit-protocol protocol-zest vault-id zest alex stackingdao hermetica)))
            (alex-assets (try! (emergency-exit-protocol protocol-alex vault-id zest alex stackingdao hermetica)))
            (stackingdao-assets (try! (emergency-exit-protocol protocol-stackingdao vault-id zest alex stackingdao hermetica)))
            (hermetica-assets (try! (emergency-exit-protocol protocol-hermetica vault-id zest alex stackingdao hermetica)))
            (total-returned (+ (+ zest-assets alex-assets) (+ stackingdao-assets hermetica-assets)))
          )
          (begin
            (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
            (print {
              event: "vault-emergency-exit",
              vault-id: vault-id,
              caller: tx-sender,
              bypassed-cooldown: true,
              tracked-zest-assets: (get allocated-assets zest-position),
              tracked-alex-assets: (get allocated-assets alex-position),
              tracked-stackingdao-assets: (get allocated-assets stackingdao-position),
              tracked-hermetica-assets: (get allocated-assets hermetica-position),
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
  )
)

(define-read-only (get-vault-execution-state (vault-id uint))
  (map-get? vault-execution-state { vault-id: vault-id })
)

(define-read-only (get-vault-position (vault-id uint) (protocol-id uint))
  (map-get? vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id })
)

;; Access pattern: permissionless-query
(define-public (get-cooldown-blocks)
  (ok (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
)

;; Access pattern: permissionless-query
(define-public (get-performance-fee-bps)
  (ok (contract-call? .protocol-config get-protocol-performance-fee-bps))
)

(define-read-only (is-protocol-supported (protocol-id uint))
  (is-supported-protocol protocol-id)
)

;; Access pattern: permissionless-query
(define-public (get-next-executable-block (vault-id uint))
  (let
    (
      (vault (unwrap! (contract-call? .vault-core get-vault-for-execution vault-id) err-vault-not-found))
      (vault-last-block (get last-execution-block vault))
      (exec-state (get-execution-state-or-default vault-id))
      (cooldown-blocks (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
      (effective-last-block (if (> (get total-executions exec-state) u0) (get last-executed-block exec-state) vault-last-block))
    )
    (ok (+ effective-last-block cooldown-blocks))
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

(define-read-only (get-vault-fees-collected (vault-id uint))
  (ok (get cumulative-fees-collected (get-execution-state-or-default vault-id)))
)

;; Access pattern: strategy-executor-or-protocol-owner
(define-public (rebalance
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
  (rebalance-vault
    vault-id
    strategy-id
    from-protocol-id
    to-protocol-id
    rebalance-amount
    from-target-weight-bps
    to-target-weight-bps
    zest
    alex
    stackingdao
    hermetica
  )
)
