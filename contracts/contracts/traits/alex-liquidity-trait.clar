;; @title V-Mind ALEX Liquidity Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Trait for routing V-Mind vault capital into ALEX liquidity positions.

(define-trait alex-liquidity-trait
  (
    (provide-alex-liquidity (uint uint) (response uint uint))
    (withdraw-alex-liquidity (uint uint) (response uint uint))
    (collect-alex-fee (uint principal) (response bool uint))
    (emergency-exit-alex (uint) (response uint uint))
  )
)
