/**
 * Display version for docs chrome.
 *
 * @remarks
 * Hardcoded because the dev client transform refuses entrypoints outside
 * `src/`, so layouts cannot import package JSON files. Keep in sync with
 * `packages/forms/package.json` when bumping a release.
 */
export const schemaEngineVersion = '0.1.0';
