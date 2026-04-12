# Strategy Evaluator Extension Patterns

This note describes how the V-Mind agent strategy evaluation engine is organized and how to safely add new strategy types.

## Core Components

- `StrategyEvaluator` interface: a strategy-specific evaluator accepts `vault`, `strategy`, and `market` input and returns a decision (`execute`, `wait`, or `error`) with a reason.
- Strategy evaluators: each strategy type has its own evaluator implementation under `agent/src/strategies`.
- `DefaultStrategyEvaluatorFactory`: maps strategy type identifiers to evaluator instances.
- `EvaluationOrchestrator`: fetches active vaults, loads strategy configuration, requests market context, runs the correct evaluator, and returns only vaults ready for execution.

## Extension Rules

1. Add a new strategy type to shared strategy types in `agent/src/strategies/strategy-evaluator.ts`.
2. Add a new typed strategy configuration shape in the same file.
3. Implement a dedicated evaluator file that only contains the logic for that strategy.
4. Register the evaluator in `DefaultStrategyEvaluatorFactory`.
5. Export the evaluator from `agent/src/strategies/index.ts`.
6. Add unit tests for happy path, isolated condition failures, and no-history edge behavior.
7. Add or update orchestrator tests if evaluator selection logic changes.

## Design Principles

- Keep evaluators pure and deterministic: avoid side effects and external writes.
- Return explicit wait reasons for operational observability.
- Use error decisions for missing critical data (for example, missing price feed or missing required protocol health).
- Keep cross-strategy logic inside orchestrator and shared types, not inside individual evaluators.

## Testing Pattern

For each evaluator:

- One execute happy path test.
- One test per decision-gating condition failing in isolation.
- Boundary tests for threshold equality.
- No prior execution history test (`lastExecutionBlock` absent or null).

For the orchestrator:

- Executes only vaults with `execute` outcomes.
- Skips disabled strategies.
- Continues processing if one evaluator throws.
- Verifies strategy type to evaluator dispatch.
