import type { FormConfig } from '@schema-engine/forms';
import { radiantElements } from '@/elements/radiant-elements';
import { createRadiantFormEngine } from '@/registries';

const engine = createRadiantFormEngine({ elements: radiantElements.all() });

/**
 * The normalized config of an authored one, which the Radiant engine validates, for helpers that take a normalized
 * config but need no rendering.
 */
export function normalizedTestConfig(config: FormConfig) {
	return engine.validateForm(config);
}
