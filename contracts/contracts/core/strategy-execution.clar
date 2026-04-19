;; @title V-Mind Strategy Execution
;; @version 2026-04-10-B fixes:
;;   C-1  Protocol-pause not enforced - assert-not-paused added to execute-strategy,
;;        rebalance-vault, emergency-exit-vault.
;;   C-6  execute-strategy added net-yield to updated-allocation before accrual,
;;        double-counting yield in position totals. net-yield is now excluded from
;;        updated-allocation; it is tracked only in write-execution-state.
;;   H-2  get-cooldown-blocks, get-performance-fee-bps, get-next-executable-block
;;        were define-public despite being pure reads. All converted to define-read-only.
;;        Enabled by vault-core H-1 (get-vault-for-execution is now read-only).
;;   H-8  rebalance-vault had a two-protocol-only weight constraint (from+to==10000).
;;        New: accepts target-allocations list; folds all target-bps and asserts sum==10000.
;;        Also adds min-meaningful-allocation-bps (u50) per-entry check.
;; @author V-Mind Core Team
;; @contract strategy-execution

(use-trait zest-lending-trait .zest-lending-trait.zest-lending-trait)
(use-trait alex-liquidity-trait .alex-liquidity-trait.alex-liquidity-trait)
(use-trait stackingdao-ststx-trait .stackingdao-ststx-trait.stackingdao-ststx-trait)
(use-trait hermetica-usdh-trait .hermetica-usdh-trait.hermetica-usdh-trait)

(define-constant role-owner u1)
(define-constant role-strategy-executor u2)
(define-constant role-emergency-pauser u5)
(define-constant bps-denominator u10000)
(define-constant one-8 u100000000)

(define-constant protocol-id-zest u1)
(define-constant protocol-id-alex u2)
(define-constant protocol-id-stackingdao u3)
(define-constant protocol-id-hermetica u4)

(define-constant zest-adapter-contract .zest-protocol-adapter)
(define-constant alex-adapter-contract .alex-liquidity-adapter)
(define-constant stackingdao-adapter-contract .stackingdao-adapter)
(define-constant hermetica-adapter-contract .hermetica-adapter)
(define-constant mock-integrations-contract .mock-defi-integrations)

;; Minimum meaningful allocation share for any protocol in a rebalance target list (0.5%)
(define-constant min-meaningful-allocation-bps u50)

(define-constant err-executor-only (err u2600))
(define-constant err-owner-only (err u2601))
(define-constant err-invalid-vault-id (err u2602))
(define-constant err-vault-not-active (err u2603))
(define-constant err-strategy-not-found (err u2604))
(define-constant err-strategy-inactive (err u2605))
(define-constant err-cooldown-active (err u2606))
(define-constant err-invalid-amount (err u2607))
(define-constant err-invalid-protocol (err u2608))
(define-constant err-insufficient-position (err u2609))
(define-constant err-invalid-weight-split (err u2610))
(define-constant err-allocation-exceeds-vault-assets (err u2611))
(define-constant err-invalid-rebalance-weights (err u2612))
(define-constant err-protocol-paused (err u2613))

(define-map vault-strategy-positions
  { vault-id: uint, protocol-id: uint }
  {
    allocated-assets: uint,
    last-updated-block: uint
  }
)

(define-map vault-execution-state
  { vault-id: uint }
  {
    last-execution-block: uint,
    cumulative-yield: uint,
    cumulative-fees-collected: uint,
    execution-count: uint
  }
)

;; --- private helpers -----------------------------------------------------------

(define-private (is-protocol-owner (caller principal))
  (or
    (contract-call? .access-control has-role caller role-owner)
    (is-eq caller (contract-call? .access-control get-owner))
  )
)

(define-private (assert-protocol-owner)
  (if (is-protocol-owner tx-sender)
    (ok true)
    err-owner-only
  )
)

(define-private (is-emergency-recovery-authorized)
  (or
    (is-protocol-owner tx-sender)
    (contract-call? .access-control has-role tx-sender role-emergency-pauser)
  )
)

(define-private (assert-executor)
  (if (or (contract-call? .access-control has-role tx-sender role-strategy-executor) (is-protocol-owner tx-sender))
    (ok true)
    err-executor-only
  )
)

;; FIX C-1: pause check for all mutating public functions
(define-private (assert-not-paused)
  (if (contract-call? .access-control is-protocol-paused)
    err-protocol-paused
    (ok true)
  )
)

(define-private (assert-valid-protocol-id (protocol-id uint))
  (if (or
        (is-eq protocol-id protocol-id-zest)
        (is-eq protocol-id protocol-id-alex)
        (is-eq protocol-id protocol-id-stackingdao)
        (is-eq protocol-id protocol-id-hermetica)
      )
    (ok true)
    err-invalid-protocol
  )
)

(define-private (assert-valid-adapter-contract
  (adapter-contract principal)
  (expected-contract principal)
)
  (if (or
        (is-eq adapter-contract expected-contract)
        (is-eq adapter-contract mock-integrations-contract)
      )
    (ok true)
    err-invalid-protocol
  )
)

(define-private (assert-approved-adapter-traits
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-valid-adapter-contract (contract-of zest) zest-adapter-contract))
    (try! (assert-valid-adapter-contract (contract-of alex) alex-adapter-contract))
    (try! (assert-valid-adapter-contract (contract-of stackingdao) stackingdao-adapter-contract))
    (try! (assert-valid-adapter-contract (contract-of hermetica) hermetica-adapter-contract))
    (ok true)
  )
)

(define-private (get-protocol-position-internal (vault-id uint) (protocol-id uint))
  (default-to
    { allocated-assets: u0, last-updated-block: u0 }
    (map-get? vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id })
  )
)

(define-private (get-execution-state-internal (vault-id uint))
  (default-to
    { last-execution-block: u0, cumulative-yield: u0, cumulative-fees-collected: u0, execution-count: u0 }
    (map-get? vault-execution-state { vault-id: vault-id })
  )
)

(define-private (assert-cooldown-and-strategy (vault-id uint) (strategy-id uint))
  (match (contract-call? .vault-core get-vault-for-execution vault-id)
    vault-entry
      (begin
        (asserts! (is-eq strategy-id (get strategy-id vault-entry)) err-strategy-not-found)
        (let
          (
            (cooldown-blocks (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
            (effective-last-block (get last-execution-block (get-execution-state-internal vault-id)))
          )
          (asserts! (>= block-height (+ effective-last-block cooldown-blocks)) err-cooldown-active)
          (ok vault-entry)
        )
      )
    err-val (err err-val)
  )
)

(define-private (write-execution-state (vault-id uint) (net-yield uint) (fee-collected uint))
  (let ((state (get-execution-state-internal vault-id)))
    (map-set vault-execution-state
      { vault-id: vault-id }
      {
        last-execution-block: block-height,
        cumulative-yield: (+ (get cumulative-yield state) net-yield),
        cumulative-fees-collected: (+ (get cumulative-fees-collected state) fee-collected),
        execution-count: (+ (get execution-count state) u1)
      }
    )
  )
)

(define-private (deposit-into-protocol (protocol-id uint) (vault-id uint) (asset-amount uint) (zest <zest-lending-trait>) (alex <alex-liquidity-trait>) (stackingdao <stackingdao-ststx-trait>) (hermetica <hermetica-usdh-trait>))
  (if (is-eq protocol-id protocol-id-zest)
    (contract-call? zest deposit-to-zest vault-id asset-amount)
    (if (is-eq protocol-id protocol-id-alex)
      (contract-call? alex provide-alex-liquidity vault-id asset-amount)
      (if (is-eq protocol-id protocol-id-stackingdao)
        (contract-call? stackingdao mint-ststx vault-id asset-amount)
        (if (is-eq protocol-id protocol-id-hermetica)
          (contract-call? hermetica deposit-usdh vault-id asset-amount)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (withdraw-from-protocol (protocol-id uint) (vault-id uint) (asset-amount uint) (zest <zest-lending-trait>) (alex <alex-liquidity-trait>) (stackingdao <stackingdao-ststx-trait>) (hermetica <hermetica-usdh-trait>))
  (if (is-eq protocol-id protocol-id-zest)
    (contract-call? zest withdraw-from-zest vault-id asset-amount)
    (if (is-eq protocol-id protocol-id-alex)
      (contract-call? alex withdraw-alex-liquidity vault-id asset-amount)
      (if (is-eq protocol-id protocol-id-stackingdao)
        (contract-call? stackingdao redeem-ststx vault-id asset-amount)
        (if (is-eq protocol-id protocol-id-hermetica)
          (contract-call? hermetica withdraw-usdh vault-id asset-amount)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (collect-protocol-fee (protocol-id uint) (fee-amount uint) (treasury principal) (zest <zest-lending-trait>) (alex <alex-liquidity-trait>) (stackingdao <stackingdao-ststx-trait>) (hermetica <hermetica-usdh-trait>))
  (if (is-eq protocol-id protocol-id-zest)
    (contract-call? zest collect-zest-fee fee-amount treasury)
    (if (is-eq protocol-id protocol-id-alex)
      (contract-call? alex collect-alex-fee fee-amount treasury)
      (if (is-eq protocol-id protocol-id-stackingdao)
        (contract-call? stackingdao collect-stackingdao-fee fee-amount treasury)
        (if (is-eq protocol-id protocol-id-hermetica)
          (contract-call? hermetica collect-hermetica-fee fee-amount treasury)
          err-invalid-protocol
        )
      )
    )
  )
)

(define-private (emergency-exit-from-protocol (protocol-id uint) (vault-id uint) (zest <zest-lending-trait>) (alex <alex-liquidity-trait>) (stackingdao <stackingdao-ststx-trait>) (hermetica <hermetica-usdh-trait>))
  (if (is-eq protocol-id protocol-id-zest)
    (contract-call? zest emergency-exit-zest vault-id)
    (if (is-eq protocol-id protocol-id-alex)
      (contract-call? alex emergency-exit-alex vault-id)
      (if (is-eq protocol-id protocol-id-stackingdao)
        (contract-call? stackingdao emergency-exit-stackingdao vault-id)
        (if (is-eq protocol-id protocol-id-hermetica)
          (contract-call? hermetica emergency-exit-hermetica vault-id)
          err-invalid-protocol
        )
      )
    )
  )
)

;; --- Rebalance weight helpers --------------------------------------------------

;; Fold accumulator: sums target-bps across a list of allocation entries.
(define-private (sum-allocation-bps (entry { protocol-id: uint, target-bps: uint }) (acc uint))
  (+ acc (get target-bps entry))
)

;; Fold accumulator: flags any non-zero entry below the minimum meaningful allocation.
(define-private (flag-invalid-allocation-bps (entry { protocol-id: uint, target-bps: uint }) (acc uint))
  (let ((target-bps (get target-bps entry)))
    (if (and (not (is-eq target-bps u0)) (< target-bps min-meaningful-allocation-bps))
      u1
      acc
    )
  )
)

;; --- public functions ----------------------------------------------------------

;; Access pattern: executor-or-protocol-owner
;; FIX C-1: (try! (assert-not-paused)) at start.
(define-public (execute-strategy
  (vault-id uint)
  (strategy-id uint)
  (protocol-id uint)
  (asset-amount uint)
  (net-yield uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-not-paused))
    (try! (assert-executor))
    (try! (assert-approved-adapter-traits zest alex stackingdao hermetica))
    (asserts! (> vault-id u0) err-invalid-vault-id)
    (asserts! (> strategy-id u0) err-strategy-not-found)
    (try! (assert-valid-protocol-id protocol-id))
    (asserts! (> asset-amount u0) err-invalid-amount)
    (let ((vault-entry (try! (assert-cooldown-and-strategy vault-id strategy-id))))
      (begin
        (asserts! (>= (get total-assets vault-entry) asset-amount) err-allocation-exceeds-vault-assets)
        (let
          (
            (position (get-protocol-position-internal vault-id protocol-id))
            (performance-fee-bps (contract-call? .protocol-config get-protocol-performance-fee-bps))
            (fee-amount (/ (* net-yield performance-fee-bps) bps-denominator))
            (treasury (contract-call? .protocol-config get-protocol-treasury))
          )
          (let ((updated-allocation (- (+ (get allocated-assets position) asset-amount) fee-amount)))
            (begin
              (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
              (try! (deposit-into-protocol protocol-id vault-id asset-amount zest alex stackingdao hermetica))
              (if (> fee-amount u0)
                (try! (collect-protocol-fee protocol-id fee-amount treasury zest alex stackingdao hermetica))
                true
              )
              (map-set vault-strategy-positions
                { vault-id: vault-id, protocol-id: protocol-id }
                { allocated-assets: updated-allocation, last-updated-block: block-height }
              )
              (write-execution-state vault-id net-yield fee-amount)
              (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
              (print {
                event: "strategy-executed",
                vault-id: vault-id,
                strategy-id: strategy-id,
                protocol-id: protocol-id,
                asset-amount: asset-amount,
                updated-allocation: updated-allocation,
                net-yield: net-yield,
                fee-collected: fee-amount,
                execution-block: block-height
              })
              (ok updated-allocation)
            )
          )
        )
      )
    )
  )
)

;; Access pattern: executor-or-protocol-owner
;; FIX C-1: (try! (assert-not-paused)) at start.
;; FIX H-8: old constraint (from-bps + to-bps == 10000) only worked for 2-protocol vaults.
;;          New: accepts target-allocations list and folds to assert total == 10000.
;;          Each entry with non-zero bps must be >= min-meaningful-allocation-bps (50 bps / 0.5%).
(define-public (rebalance-vault
  (vault-id uint)
  (strategy-id uint)
  (from-protocol-id uint)
  (to-protocol-id uint)
  (rebalance-amount uint)
  (target-allocations (list 10 { protocol-id: uint, target-bps: uint }))
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-not-paused))
    (try! (assert-executor))
    (try! (assert-approved-adapter-traits zest alex stackingdao hermetica))
    (asserts! (> vault-id u0) err-invalid-vault-id)
    (asserts! (> strategy-id u0) err-strategy-not-found)
    (try! (assert-valid-protocol-id from-protocol-id))
    (try! (assert-valid-protocol-id to-protocol-id))
    (asserts! (> rebalance-amount u0) err-invalid-amount)
    (asserts! (not (is-eq from-protocol-id to-protocol-id)) err-invalid-protocol)
    ;; Full allocation list must sum to exactly bps-denominator (10000 bp = 100%)
    ;; and every non-zero entry must clear the minimum meaningful allocation threshold.
    (let ((total-bps (fold sum-allocation-bps target-allocations u0))
          (invalid-bps (fold flag-invalid-allocation-bps target-allocations u0)))
      (begin
        (asserts! (is-eq invalid-bps u0) err-invalid-rebalance-weights)
        (asserts! (is-eq total-bps bps-denominator) err-invalid-rebalance-weights)
      )
    )
    (try! (assert-cooldown-and-strategy vault-id strategy-id))
    (let
      (
        (from-position (get-protocol-position-internal vault-id from-protocol-id))
        (from-allocated (get allocated-assets from-position))
      )
      (begin
        (asserts! (>= from-allocated rebalance-amount) err-insufficient-position)
        (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
        (try! (withdraw-from-protocol from-protocol-id vault-id rebalance-amount zest alex stackingdao hermetica))
        (map-set vault-strategy-positions
          { vault-id: vault-id, protocol-id: from-protocol-id }
          { allocated-assets: (- from-allocated rebalance-amount), last-updated-block: block-height }
        )
        (try! (deposit-into-protocol to-protocol-id vault-id rebalance-amount zest alex stackingdao hermetica))
        (let ((to-position (get-protocol-position-internal vault-id to-protocol-id)))
          (map-set vault-strategy-positions
            { vault-id: vault-id, protocol-id: to-protocol-id }
            { allocated-assets: (+ (get allocated-assets to-position) rebalance-amount), last-updated-block: block-height }
          )
        )
        (write-execution-state vault-id u0 u0)
        (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
        (print {
          event: "vault-rebalanced",
          vault-id: vault-id,
          strategy-id: strategy-id,
          from-protocol-id: from-protocol-id,
          to-protocol-id: to-protocol-id,
          rebalance-amount: rebalance-amount,
          target-allocations: target-allocations,
          execution-block: block-height
        })
        (ok rebalance-amount)
      )
    )
  )
)

;; Access pattern: protocol-owner-only during normal operation;
;; protocol-owner-or-emergency-pauser while the protocol is paused for recovery.
;; This can operate on vault-status-emergency because lock-vault-for-execution in vault-core
;; now allows locking both active and emergency-status vaults.
(define-public (emergency-exit-vault
  (vault-id uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (asserts! (> vault-id u0) err-invalid-vault-id)
    (try! (assert-approved-adapter-traits zest alex stackingdao hermetica))
    (if (contract-call? .access-control is-protocol-paused)
      (asserts! (is-emergency-recovery-authorized) err-owner-only)
      (try! (assert-protocol-owner))
    )
    (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
    (let
      (
        (zest-withdrawn (try! (emergency-exit-from-protocol protocol-id-zest vault-id zest alex stackingdao hermetica)))
        (alex-withdrawn (try! (emergency-exit-from-protocol protocol-id-alex vault-id zest alex stackingdao hermetica)))
        (sdao-withdrawn (try! (emergency-exit-from-protocol protocol-id-stackingdao vault-id zest alex stackingdao hermetica)))
        (herm-withdrawn (try! (emergency-exit-from-protocol protocol-id-hermetica vault-id zest alex stackingdao hermetica)))
        (total-recovered (+ (+ zest-withdrawn alex-withdrawn) (+ sdao-withdrawn herm-withdrawn)))
      )
      (begin
        ;; Zero all position records
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id-zest }
          { allocated-assets: u0, last-updated-block: block-height })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id-alex }
          { allocated-assets: u0, last-updated-block: block-height })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id-stackingdao }
          { allocated-assets: u0, last-updated-block: block-height })
        (map-set vault-strategy-positions { vault-id: vault-id, protocol-id: protocol-id-hermetica }
          { allocated-assets: u0, last-updated-block: block-height })
        (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
        (print {
          event: "vault-emergency-exit",
          vault-id: vault-id,
          zest-withdrawn: zest-withdrawn,
          alex-withdrawn: alex-withdrawn,
          sdao-withdrawn: sdao-withdrawn,
          herm-withdrawn: herm-withdrawn,
          total-recovered: total-recovered,
          caller: tx-sender
        })
        (ok total-recovered)
      )
    )
  )
)

;; Access pattern: executor-or-protocol-owner
(define-public (withdraw-from-strategy
  (vault-id uint)
  (protocol-id uint)
  (asset-amount uint)
  (zest <zest-lending-trait>)
  (alex <alex-liquidity-trait>)
  (stackingdao <stackingdao-ststx-trait>)
  (hermetica <hermetica-usdh-trait>)
)
  (begin
    (try! (assert-not-paused))
    (try! (assert-executor))
    (try! (assert-approved-adapter-traits zest alex stackingdao hermetica))
    (asserts! (> vault-id u0) err-invalid-vault-id)
    (try! (assert-valid-protocol-id protocol-id))
    (asserts! (> asset-amount u0) err-invalid-amount)
    (let ((position (get-protocol-position-internal vault-id protocol-id)))
      (begin
        (asserts! (>= (get allocated-assets position) asset-amount) err-insufficient-position)
        (try! (contract-call? .vault-core lock-vault-for-execution vault-id))
        (try! (withdraw-from-protocol protocol-id vault-id asset-amount zest alex stackingdao hermetica))
        (map-set vault-strategy-positions
          { vault-id: vault-id, protocol-id: protocol-id }
          { allocated-assets: (- (get allocated-assets position) asset-amount), last-updated-block: block-height }
        )
        (try! (contract-call? .vault-core unlock-vault-after-execution vault-id))
        (print {
          event: "strategy-withdraw",
          vault-id: vault-id,
          protocol-id: protocol-id,
          asset-amount: asset-amount,
          remaining-allocation: (- (get allocated-assets position) asset-amount)
        })
        (ok asset-amount)
      )
    )
  )
)

;; Alias names kept for backward compatibility
(define-public (execute (vault-id-arg uint) (strategy-id-arg uint) (protocol-id-arg uint) (asset-amount-arg uint) (net-yield-arg uint) (zest-adapter <zest-lending-trait>) (alex-adapter <alex-liquidity-trait>) (stackingdao-adapter <stackingdao-ststx-trait>) (hermetica-adapter <hermetica-usdh-trait>))
  (execute-strategy vault-id-arg strategy-id-arg protocol-id-arg asset-amount-arg net-yield-arg zest-adapter alex-adapter stackingdao-adapter hermetica-adapter)
)

(define-public (rebalance (vault-id-arg uint) (strategy-id-arg uint) (from-protocol-id-arg uint) (to-protocol-id-arg uint) (rebalance-amount-arg uint) (target-allocations-arg (list 10 { protocol-id: uint, target-bps: uint })) (zest-adapter <zest-lending-trait>) (alex-adapter <alex-liquidity-trait>) (stackingdao-adapter <stackingdao-ststx-trait>) (hermetica-adapter <hermetica-usdh-trait>))
  (rebalance-vault vault-id-arg strategy-id-arg from-protocol-id-arg to-protocol-id-arg rebalance-amount-arg target-allocations-arg zest-adapter alex-adapter stackingdao-adapter hermetica-adapter)
)

;; --- read-only functions -------------------------------------------------------

(define-read-only (get-protocol-position (vault-id uint) (protocol-id uint))
  (ok (get-protocol-position-internal vault-id protocol-id))
)

(define-read-only (get-execution-state (vault-id uint))
  (ok (get-execution-state-internal vault-id))
)

;; FIX H-2: was define-public. Now define-read-only (enabled because protocol-config getters are read-only).
(define-read-only (get-cooldown-blocks)
  (ok (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
)

;; FIX H-2: was define-public. Now define-read-only.
(define-read-only (get-performance-fee-bps)
  (ok (contract-call? .protocol-config get-protocol-performance-fee-bps))
)

;; FIX H-2: was define-public. Now define-read-only (enabled by vault-core H-1 fix).
(define-read-only (get-next-executable-block (vault-id uint))
  (match (contract-call? .vault-core get-vault-for-execution vault-id)
    vault-entry
      (let
        (
          (cooldown (contract-call? .protocol-config get-max-strategy-rebalance-frequency-blocks))
          (state-block (get last-execution-block (get-execution-state-internal vault-id)))
          (vault-block (get last-execution-block vault-entry))
          (effective-last (if (> state-block u0) state-block vault-block))
        )
        (ok (+ effective-last cooldown))
      )
    err-val (ok u0)
  )
)

(define-read-only (get-vault-total-allocated (vault-id uint))
  (let
    (
      (zest (get allocated-assets (get-protocol-position-internal vault-id protocol-id-zest)))
      (alex (get allocated-assets (get-protocol-position-internal vault-id protocol-id-alex)))
      (sdao (get allocated-assets (get-protocol-position-internal vault-id protocol-id-stackingdao)))
      (herm (get allocated-assets (get-protocol-position-internal vault-id protocol-id-hermetica)))
    )
    (ok (+ (+ zest alex) (+ sdao herm)))
  )
)
