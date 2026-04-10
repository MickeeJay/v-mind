;; @title V-Mind Access Control
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Centralized role and ownership manager for all V-Mind protocol contracts.
;; @dev This scaffold defines role storage and administrative entry points consumed by other modules.
;; @contract access-control
;; @constants
;; - role-owner: Role ID for super-admin controls.
;; - role-operator: Role ID for strategy operators.
;; - role-guardian: Role ID for emergency pause guardians.
;; - role-strategy-registrar: Role ID for principals allowed to register and manage strategies.
;; - err-owner-only: Returned when caller is not current owner.
;; - err-not-implemented: Returned by scaffolded mutating functions pending implementation.
;; @data-vars
;; - contract-owner: Principal with authority to grant and revoke roles.
;; - pending-owner: Optional principal nominated for ownership transfer.
;; @maps
;; - role-membership: Tracks account-to-role membership boolean.
;; @public-functions
;; - transfer-ownership (owner-only): Proposes new contract owner.
;; - accept-ownership (pending-owner-only): Completes two-step ownership transfer.
;; - grant-role (owner-only): Grants a role to an account.
;; - revoke-role (owner-only): Revokes a role from an account.
;; - renounce-role (self-only): Allows caller to drop one of their roles.
;; @external-contracts
;; - Read by: protocol-config, strategy-registry, vault-registry, vault-core.
;; @limitations
;; - Role admin hierarchy is not fully implemented in this scaffold.

(define-constant role-owner u1)
(define-constant role-operator u2)
(define-constant role-guardian u3)
(define-constant role-strategy-registrar u4)
(define-constant err-owner-only (err u2000))
(define-constant err-invalid-role (err u2001))
(define-constant err-role-not-assigned (err u2002))

(define-data-var contract-owner principal tx-sender)
(define-data-var pending-owner (optional principal) none)

(define-map role-membership
  {
    account: principal,
    role: uint
  }
  {
    enabled: bool
  }
)

(define-private (is-valid-role (role uint))
  (or
    (is-eq role role-owner)
    (is-eq role role-operator)
    (is-eq role role-guardian)
    (is-eq role role-strategy-registrar)
  )
)

(define-public (transfer-ownership (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (ok (var-set pending-owner (some new-owner)))
  )
)

(define-public (accept-ownership)
  (match (var-get pending-owner)
    new-owner
      (begin
        (asserts! (is-eq tx-sender new-owner) err-owner-only)
        (var-set contract-owner new-owner)
        (ok (var-set pending-owner none))
      )
    err-owner-only
  )
)

(define-public (grant-role (account principal) (role uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (asserts! (is-valid-role role) err-invalid-role)
    (map-set role-membership
      { account: account, role: role }
      { enabled: true }
    )
    (ok true)
  )
)

(define-public (revoke-role (account principal) (role uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (asserts! (is-valid-role role) err-invalid-role)
    (asserts! (default-to false (get enabled (map-get? role-membership { account: account, role: role }))) err-role-not-assigned)
    (map-delete role-membership { account: account, role: role })
    (ok true)
  )
)

(define-public (renounce-role (role uint))
  (begin
    (asserts! (is-valid-role role) err-invalid-role)
    (asserts! (default-to false (get enabled (map-get? role-membership { account: tx-sender, role: role }))) err-role-not-assigned)
    (map-delete role-membership { account: tx-sender, role: role })
    (ok true)
  )
)

(define-read-only (has-role (account principal) (role uint))
  (default-to false (get enabled (map-get? role-membership { account: account, role: role })))
)

(define-read-only (get-owner)
  (var-get contract-owner)
)
