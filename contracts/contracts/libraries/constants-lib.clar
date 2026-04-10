;; @title V-Mind Constants Library
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Defines global protocol constants used in validation and fee calculations.
;; @dev Constants are exposed through read-only functions for discovery by off-chain services.
;; @contract constants-lib
;; @constants
;; - bps-denominator: Basis point denominator used for all fee math.
;; - max-platform-fee-bps: Upper bound for protocol-level fee configuration.
;; - max-performance-fee-bps: Upper bound for strategy performance fee.
;; - role-owner: Canonical role ID representing the protocol owner.
;; - role-operator: Canonical role ID for strategy operators.
;; - role-guardian: Canonical role ID for emergency guardians.
;; - role-strategy-registrar: Canonical role ID for strategy registration authority.
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - get-bps-denominator: Returns basis-point denominator.
;; - get-role-owner: Returns role ID for owner.
;; - get-role-operator: Returns role ID for operator.
;; - get-role-guardian: Returns role ID for guardian.
;; - get-role-strategy-registrar: Returns role ID for strategy registrar.
;; @external-contracts
;; - none
;; @limitations
;; - Constants are static and require redeployment to change.

(define-constant bps-denominator u10000)
(define-constant max-platform-fee-bps u1000)
(define-constant max-performance-fee-bps u3000)
(define-constant max-fee-rate-bps u3000)

(define-constant minimum-deposit-microstx u1000000)
(define-constant maximum-cooldown-duration-blocks u52595)
(define-constant maximum-vaults-per-user u200)

(define-constant role-owner u1)
(define-constant role-strategy-executor u2)
(define-constant role-strategy-registrar u3)
(define-constant role-vault-operator u4)
(define-constant role-emergency-pauser u5)

;; TODO: replace with confirmed mainnet principal before deployment.
(define-constant principal-zest-protocol 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1-5)
;; TODO: replace with confirmed mainnet principal before deployment.
(define-constant principal-alex-protocol 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.amm-swap-pool-v1-1)
;; TODO: replace with confirmed mainnet principal before deployment.
(define-constant principal-stackingdao-protocol 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v6)
;; TODO: replace with confirmed mainnet principal before deployment.
(define-constant principal-hermetica-protocol 'SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.staking-v1-1)

(define-read-only (get-bps-denominator)
  (ok bps-denominator)
)

(define-read-only (get-role-owner)
  (ok role-owner)
)

(define-read-only (get-role-strategy-executor)
  (ok role-strategy-executor)
)

(define-read-only (get-role-strategy-registrar)
  (ok role-strategy-registrar)
)

(define-read-only (get-role-vault-operator)
  (ok role-vault-operator)
)

(define-read-only (get-role-emergency-pauser)
  (ok role-emergency-pauser)
)

(define-read-only (get-max-fee-rate-bps)
  (ok max-fee-rate-bps)
)

(define-read-only (get-minimum-deposit-microstx)
  (ok minimum-deposit-microstx)
)

(define-read-only (get-maximum-cooldown-duration-blocks)
  (ok maximum-cooldown-duration-blocks)
)

(define-read-only (get-maximum-vaults-per-user)
  (ok maximum-vaults-per-user)
)

(define-read-only (get-zest-protocol-principal)
  (ok principal-zest-protocol)
)

(define-read-only (get-alex-protocol-principal)
  (ok principal-alex-protocol)
)

(define-read-only (get-stackingdao-protocol-principal)
  (ok principal-stackingdao-protocol)
)

(define-read-only (get-hermetica-protocol-principal)
  (ok principal-hermetica-protocol)
)
