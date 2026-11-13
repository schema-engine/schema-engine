import { expectTypeOf } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import type { NormalizedFormConfig } from '@/lib/normalized-form-config';

/** The validator contract the YAML layer (`parseYaml`) takes; `engine.safeValidateForm` must satisfy it. */
type YamlValidate<T> = (value: unknown) =>
	| { success: true; data: T }
	| {
			success: false;
			issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }>;
	  };

const engine = createFormEngine();

const validate: YamlValidate<NormalizedFormConfig> = (value) => engine.safeValidateForm(value);
void validate;
expectTypeOf(engine.safeValidateForm(undefined)).toExtend<ReturnType<YamlValidate<NormalizedFormConfig>>>();
