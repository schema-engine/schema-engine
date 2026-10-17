import type { FormConfig } from '@schema-engine/forms/schemas';
import { markNormalizedFormConfig } from '@schema-engine/forms/lib/normalized-form-config';

const testOwner = {};

/**
 * Frozen, branded snapshot of an authored config, for helpers that take a
 * normalized config but need no engine.
 *
 * @remarks
 * Registration schemas do not run, so the snapshot keeps exactly what the test
 * authored, as the plain object fixtures did.
 */
export function normalizedTestConfig(config: FormConfig) {
	return markNormalizedFormConfig(config, testOwner);
}
