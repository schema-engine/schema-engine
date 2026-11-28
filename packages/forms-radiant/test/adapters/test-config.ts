import type { FormConfig } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/registrations';
import { createRadiantFormEngine } from '@/registries';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

/**
 * The normalized config of an authored one, which the Radiant engine validates, for helpers that take a normalized
 * config but need no rendering.
 */
export function normalizedTestConfig(config: FormConfig) {
	return engine.validateForm(config);
}
