;; @title V-Mind StackingDAO Direct Helpers Trait
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Trait for authoritative StackingDAO balance reads through direct helpers.

(define-trait stackingdao-direct-helpers-trait
  (
    (get-user-balance-in-protocol (principal principal uint) (response uint uint))
  )
)
