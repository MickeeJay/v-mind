;; @title V-Mind Hermetica Staking Read Trait
;; @version 0.1.0
;; @notice Minimal read interface for Hermetica USDh staking rate queries.

(define-trait hermetica-staking-trait
  (
    (get-usdh-per-susdh () (response uint uint))
  )
)