;; @title V-Mind Zest Lending Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Trait for routing V-Mind vault capital into Zest lending markets.

(define-trait zest-lending-trait
  (
    (deposit-to-zest (uint uint) (response uint uint))
    (withdraw-from-zest (uint uint) (response uint uint))
    (collect-zest-fee (uint principal) (response bool uint))
    (emergency-exit-zest (uint) (response uint uint))
  )
)
