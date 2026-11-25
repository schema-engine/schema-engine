/**
 * The conformance suite of the form state container contract.
 *
 * @remarks
 * It depends on no test runner: pass the `describe` and `test` of Vitest, Jest, Bun test, `node:test` or any runner
 * with the same two functions. Import this entry only from a test file.
 */
export { formStateContainerConformance, type ConformanceRunner } from './form-state-container-conformance';
