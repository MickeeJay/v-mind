;; @title V-Mind StackingDAO stSTX Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Trait for routing V-Mind vault capital into StackingDAO stSTX minting.

(define-trait stackingdao-ststx-trait
  (
    (mint-ststx (uint uint) (response uint uint))
    (redeem-ststx (uint uint) (response uint uint))
    (collect-stackingdao-fee (uint principal) (response bool uint))
    (emergency-exit-stackingdao (uint) (response uint uint))
  )
)
