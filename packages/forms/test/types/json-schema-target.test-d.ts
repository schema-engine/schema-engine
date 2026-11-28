import { describe, expectTypeOf, it } from 'vitest';
import type { JSONSchemaTarget } from '@schema-engine/registry';
import { createFormEngine } from '@/engine/create-form-engine';

const engine = createFormEngine();

describe('the target of the JSON Schema export', () => {
	it('is the registry JSONSchemaTarget in all three generators', () => {
		expectTypeOf<NonNullable<Parameters<typeof engine.generateFormConfigSchema>[0]>['target']>().toEqualTypeOf<
			JSONSchemaTarget | undefined
		>();
		expectTypeOf<NonNullable<Parameters<typeof engine.generateJSONSchemaCollection>[0]>['target']>().toEqualTypeOf<
			JSONSchemaTarget | undefined
		>();
		expectTypeOf<NonNullable<Parameters<typeof engine.generateActionConfigSchema>[1]>['target']>().toEqualTypeOf<
			JSONSchemaTarget | undefined
		>();
	});

	it('refuses the Zod spellings', () => {
		// @ts-expect-error the older Zod spelling of draft-07 is not a target
		expectTypeOf(engine.generateFormConfigSchema).toBeCallableWith({ target: 'draft-7' });
		// @ts-expect-error the older Zod spelling of draft-04 is not a target
		expectTypeOf(engine.generateJSONSchemaCollection).toBeCallableWith({ target: 'draft-4' });
	});
});
