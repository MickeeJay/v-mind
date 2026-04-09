;; @title V-Mind Hermetica USDh Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Trait for routing V-Mind vault capital into Hermetica USDh vaults.

(define-trait hermetica-usdh-trait
  (
    (deposit-usdh (uint uint) (response uint uint))
    (withdraw-usdh (uint uint) (response uint uint))
    (collect-hermetica-fee (uint principal) (response bool uint))
    (emergency-exit-hermetica (uint) (response uint uint))
  )
)
