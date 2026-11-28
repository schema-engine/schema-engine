import type { ReadOnlyRegistry } from '@schema-engine/registry';
import { expectTypeOf } from 'vitest';
import type { EngineRegistries, FormEngine } from '@/engine/form-engine';
import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';

expectTypeOf<EngineRegistries['elements']>().toEqualTypeOf<ReadOnlyRegistry<AnyElementRegistration>>();
expectTypeOf<EngineRegistries['recipes']>().toEqualTypeOf<ReadOnlyRegistry<AnyRecipeRegistration>>();
expectTypeOf<EngineRegistries['actions']>().toEqualTypeOf<ReadOnlyRegistry<AnyActionRegistration>>();

declare const engine: FormEngine;
expectTypeOf(engine.actions.get('log')?.$type).toEqualTypeOf<string | undefined>();
expectTypeOf(engine.elements.get('input')?.$type).toEqualTypeOf<string | undefined>();
expectTypeOf(engine.recipes.get('card')?.$type).toEqualTypeOf<string | undefined>();
expectTypeOf(engine.elements.hint).toEqualTypeOf<string | undefined>();
