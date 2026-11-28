import type { FormEngineRegistrationLists } from '@/engine/build-form-engine';
import type { MergedActionRegistrationMap, MergedRegistrationMap } from '@/builder/types.utils';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import { expectTypeOf } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { validateFormValues, type ValidationElement, type ValidationStep } from '@schema-engine/forms';

expectTypeOf<MergedActionRegistrationMap<[]>>().toEqualTypeOf<MergedRegistrationMap<[]>>();
expectTypeOf(createFormEngine().getFormConfigStandardSchema()).toEqualTypeOf<StandardJSONSchemaV1>();
expectTypeOf<Parameters<typeof validateFormValues>[0]['steps']>().toEqualTypeOf<readonly ValidationStep[]>();
expectTypeOf<ValidationStep['elements']>().toEqualTypeOf<readonly ValidationElement[]>();
// @ts-expect-error The separate grid and appearance options are gone; both live under layout.
const separateGrid: FormEngineRegistrationLists = { grid: {} };
// @ts-expect-error The separate grid and appearance options are gone; both live under layout.
const separateAppearance: FormEngineRegistrationLists = { appearance: {} };
void separateGrid;
void separateAppearance;
