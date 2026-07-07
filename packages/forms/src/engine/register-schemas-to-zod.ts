import { z } from 'zod';
import type { BaseRegistration } from '@schema-engine/registry';

type ZodSchemaWithRegister = z.ZodTypeAny & {
	register: (registry: ReturnType<typeof z.registry>, metadata: Record<string, unknown>) => void;
};

/**
 * Register all items from a registry into a Zod metadata registry.
 * Temporary bridge until SchemaMetadataCatalog replaces z.registry() (w2-01).
 */
export function registerSchemasToZod<T extends BaseRegistration>(
	registry: { getAll(): T[] },
	zodRegistry: ReturnType<typeof z.registry>,
	metadataBuilder: (item: T) => Record<string, unknown>,
): void {
	for (const item of registry.getAll()) {
		const schema = item.schema as ZodSchemaWithRegister;
		if (typeof schema.register === 'function') {
			schema.register(zodRegistry, metadataBuilder(item));
		}
	}
}
