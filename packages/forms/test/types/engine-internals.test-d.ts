import type { FormEngineRegistrationLists } from '@/engine/build-form-engine';
import type { MergedActionRegistrationMap, MergedRegistrationMap } from '@/builder/types.utils';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import { expectTypeOf } from 'vitest';
import { getDefaultCompiledGrid } from '@schema-engine/layout';
import { createFormEngine } from '@/engine/create-form-engine';

expectTypeOf<MergedActionRegistrationMap<[]>>().toEqualTypeOf<MergedRegistrationMap<[]>>();
expectTypeOf(createFormEngine().getFormConfigStandardSchema()).toEqualTypeOf<StandardJSONSchemaV1>();
// @ts-expect-error A caller chooses authored grid options or an inherited compiled grid.
const invalidGrid: FormEngineRegistrationLists = { grid: {}, compiledGrid: getDefaultCompiledGrid() };
void invalidGrid;
