import type { ReadOnlyRegistry } from '@schema-engine/registry';
import { expectTypeOf } from 'vitest';
import type { EngineRegistries } from '@/engine/form-engine';
import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';

expectTypeOf<EngineRegistries['elements']>().toEqualTypeOf<ReadOnlyRegistry<AnyElementRegistration>>();
expectTypeOf<EngineRegistries['recipes']>().toEqualTypeOf<ReadOnlyRegistry<AnyRecipeRegistration>>();
expectTypeOf<EngineRegistries['actions']>().toEqualTypeOf<ReadOnlyRegistry<AnyActionRegistration>>();
