;; @title V-Mind Zest Reserve Trait
;; @version 2026-04-16 reserve balance read interface for Zest production monitoring.
;; @notice Read-only balance helper used by the Zest adapter in production mode.

(define-trait zest-reserve-trait
  (
    (get-user-underlying-asset-balance (principal principal principal) (response uint uint))
  )
)