import type { FormEngineRegistrationLists } from '@/engine/build-form-engine';
import type { MergedActionRegistrationMap, MergedRegistrationMap } from '@/builder/types.utils';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import { expectTypeOf } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';

expectTypeOf<MergedActionRegistrationMap<[]>>().toEqualTypeOf<MergedRegistrationMap<[]>>();
expectTypeOf(createFormEngine().getFormConfigStandardSchema()).toEqualTypeOf<StandardJSONSchemaV1>();
// @ts-expect-error The separate grid and appearance options are gone; both live under layout.
const separateGrid: FormEngineRegistrationLists = { grid: {} };
// @ts-expect-error The separate grid and appearance options are gone; both live under layout.
const separateAppearance: FormEngineRegistrationLists = { appearance: {} };
void separateGrid;
void separateAppearance;
