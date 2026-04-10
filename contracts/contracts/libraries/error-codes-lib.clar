;; @title V-Mind Error Codes Library
;; @version 2026-04-10 consolidated protocol-wide named error code catalog
;; @author V-Mind Core Team
;; @notice Canonical error code definitions for the V-Mind protocol contract suite.
;; @dev This contract provides a single source of truth for error classes used across modules.
;; @contract error-codes-lib
;; @constants
;; - err-not-authorized: Returned when caller lacks required permissions.
;; - err-paused: Returned when protocol or module is paused.
;; - err-invalid-argument: Returned when an input value fails validation.
;; - err-not-found: Returned when requested entity does not exist.
;; - err-already-exists: Returned when creating an entity that already exists.
;; - err-not-implemented: Returned by scaffolded functions until logic is implemented.
;; @data-vars
;; - none
;; @maps
;; - none
;; @public-functions
;; - get-error-domain: Returns the V-Mind error domain identifier for off-chain indexing.
;; @external-contracts
;; - none
;; @limitations
;; - Clarity contracts cannot import constants from another contract at compile time.
;; - Downstream contracts may duplicate numeric codes during early scaffolding.

(define-constant ERR-GLOBAL-NOT-AUTHORIZED (err u1000))
(define-constant ERR-GLOBAL-PAUSED (err u1001))
(define-constant ERR-GLOBAL-INVALID-ARGUMENT (err u1002))
(define-constant ERR-GLOBAL-NOT-FOUND (err u1003))
(define-constant ERR-GLOBAL-ALREADY-EXISTS (err u1004))

(define-constant ERR-LIB-ACCOUNTING-INVALID-INPUT (err u1200))
(define-constant ERR-LIB-VALIDATION-FAILED (err u1300))

(define-constant ERR-ACCESS-OWNER-ONLY (err u2000))
(define-constant ERR-ACCESS-INVALID-ROLE (err u2001))
(define-constant ERR-ACCESS-ROLE-NOT-ASSIGNED (err u2002))
(define-constant ERR-ACCESS-PAUSER-ONLY (err u2003))

(define-constant ERR-CONFIG-OWNER-ONLY (err u2100))
(define-constant ERR-CONFIG-INVALID-FEE-RATE (err u2101))
(define-constant ERR-CONFIG-INVALID-MAX-VAULTS (err u2102))
(define-constant ERR-CONFIG-INVALID-MIN-DEPOSIT (err u2103))
(define-constant ERR-CONFIG-INVALID-REBALANCE-FREQUENCY (err u2104))
(define-constant ERR-CONFIG-INVALID-ASSET-LIMITS (err u2105))
(define-constant ERR-CONFIG-INVALID-ASSET-SYMBOL (err u2106))
(define-constant ERR-CONFIG-ASSET-ALREADY-SUPPORTED (err u2107))
(define-constant ERR-CONFIG-ASSET-NOT-SUPPORTED (err u2108))
(define-constant ERR-CONFIG-INVALID-OVERRIDE-KEY (err u2109))
(define-constant ERR-CONFIG-OVERRIDE-NOT-FOUND (err u2110))
(define-constant ERR-CONFIG-STRATEGY-TYPE-ALREADY-WHITELISTED (err u2111))
(define-constant ERR-CONFIG-STRATEGY-TYPE-NOT-WHITELISTED (err u2112))

(define-constant ERR-REGISTRY-ALREADY-REGISTERED (err u2201))
(define-constant ERR-REGISTRY-NOT-FOUND (err u2202))
(define-constant ERR-REGISTRY-REGISTRAR-ONLY (err u2203))
(define-constant ERR-REGISTRY-INVALID-STRATEGY-TYPE (err u2204))
(define-constant ERR-REGISTRY-INVALID-RISK-TIER (err u2205))
(define-constant ERR-REGISTRY-INVALID-STRATEGY-NAME (err u2206))
(define-constant ERR-REGISTRY-STRATEGY-LIST-FULL (err u2207))
(define-constant ERR-REGISTRY-STRATEGY-INACTIVE (err u2208))
(define-constant ERR-REGISTRY-EXECUTOR-MISMATCH (err u2209))

(define-constant ERR-VAULT-NOT-FOUND (err u2400))
(define-constant ERR-VAULT-OWNER-ONLY (err u2401))
(define-constant ERR-VAULT-PROTOCOL-OWNER-ONLY (err u2402))
(define-constant ERR-VAULT-INVALID-AMOUNT (err u2403))
(define-constant ERR-VAULT-ASSET-NOT-SUPPORTED (err u2404))
(define-constant ERR-VAULT-ASSET-INACTIVE (err u2405))
(define-constant ERR-VAULT-ASSET-MISMATCH (err u2406))
(define-constant ERR-VAULT-DEPOSIT-BELOW-MINIMUM (err u2407))
(define-constant ERR-VAULT-DEPOSIT-ABOVE-ASSET-MAX (err u2408))
(define-constant ERR-VAULT-INVALID-STRATEGY (err u2409))
(define-constant ERR-VAULT-STRATEGY-INACTIVE (err u2410))
(define-constant ERR-VAULT-NOT-ACTIVE (err u2411))
(define-constant ERR-VAULT-LOCKED (err u2412))
(define-constant ERR-VAULT-INSUFFICIENT-BALANCE (err u2413))
(define-constant ERR-VAULT-NOT-PAUSED (err u2414))
(define-constant ERR-VAULT-NOT-EMPTY (err u2415))
(define-constant ERR-VAULT-CLOSED (err u2416))

(define-constant ERR-EXEC-EXECUTOR-ONLY (err u2600))
(define-constant ERR-EXEC-OWNER-ONLY (err u2601))
(define-constant ERR-EXEC-VAULT-NOT-FOUND (err u2602))
(define-constant ERR-EXEC-VAULT-NOT-ACTIVE (err u2603))
(define-constant ERR-EXEC-STRATEGY-MISMATCH (err u2604))
(define-constant ERR-EXEC-STRATEGY-INACTIVE (err u2605))
(define-constant ERR-EXEC-COOLDOWN-ACTIVE (err u2606))
(define-constant ERR-EXEC-INVALID-AMOUNT (err u2607))
(define-constant ERR-EXEC-INVALID-PROTOCOL (err u2608))
(define-constant ERR-EXEC-INSUFFICIENT-POSITION (err u2609))
(define-constant ERR-EXEC-INVALID-WEIGHT-SPLIT (err u2610))
(define-constant ERR-EXEC-ALLOCATION-EXCEEDS-VAULT-ASSETS (err u2611))

(define-constant ERR-TOKEN-NOT-TOKEN-OWNER (err u2800))
(define-constant ERR-TOKEN-OWNER-ONLY (err u2801))
(define-constant ERR-TOKEN-ALREADY-INITIALIZED (err u2802))
(define-constant ERR-TOKEN-INVALID-DECIMALS (err u2803))
(define-constant ERR-TOKEN-VAULT-CORE-ONLY (err u2804))
(define-constant ERR-TOKEN-INVALID-AMOUNT (err u2805))
(define-constant ERR-TOKEN-INSUFFICIENT-SHARES (err u2806))
(define-constant ERR-TOKEN-VAULT-CONTEXT-REQUIRED (err u2807))

(define-constant ERR-ADAPTER-ZEST-OWNER-ONLY (err u3400))
(define-constant ERR-ADAPTER-ZEST-INVALID-AMOUNT (err u3401))
(define-constant ERR-ADAPTER-ZEST-INSUFFICIENT-POSITION (err u3402))
(define-constant ERR-ADAPTER-ZEST-EXTERNAL-CALL-FAILED (err u3403))
(define-constant ERR-ADAPTER-ZEST-UNAUTHORIZED-CALLER (err u3404))
(define-constant ERR-ADAPTER-ZEST-INVALID-TREASURY (err u3405))

(define-constant ERR-ADAPTER-ALEX-OWNER-ONLY (err u3500))
(define-constant ERR-ADAPTER-ALEX-INVALID-AMOUNT (err u3501))
(define-constant ERR-ADAPTER-ALEX-INSUFFICIENT-POSITION (err u3502))
(define-constant ERR-ADAPTER-ALEX-EXTERNAL-CALL-FAILED (err u3503))
(define-constant ERR-ADAPTER-ALEX-UNAUTHORIZED-CALLER (err u3504))
(define-constant ERR-ADAPTER-ALEX-INVALID-TREASURY (err u3505))

(define-constant ERR-ADAPTER-STACKINGDAO-OWNER-ONLY (err u3600))
(define-constant ERR-ADAPTER-STACKINGDAO-INVALID-AMOUNT (err u3601))
(define-constant ERR-ADAPTER-STACKINGDAO-INSUFFICIENT-POSITION (err u3602))
(define-constant ERR-ADAPTER-STACKINGDAO-EXTERNAL-CALL-FAILED (err u3603))
(define-constant ERR-ADAPTER-STACKINGDAO-UNAUTHORIZED-CALLER (err u3604))
(define-constant ERR-ADAPTER-STACKINGDAO-INVALID-TREASURY (err u3605))

(define-constant ERR-ADAPTER-HERMETICA-OWNER-ONLY (err u3700))
(define-constant ERR-ADAPTER-HERMETICA-INVALID-AMOUNT (err u3701))
(define-constant ERR-ADAPTER-HERMETICA-INSUFFICIENT-POSITION (err u3702))
(define-constant ERR-ADAPTER-HERMETICA-EXTERNAL-CALL-FAILED (err u3703))
(define-constant ERR-ADAPTER-HERMETICA-UNAUTHORIZED-CALLER (err u3704))
(define-constant ERR-ADAPTER-HERMETICA-INVALID-TREASURY (err u3705))

(define-read-only (get-error-domain)
  (ok u1)
)
