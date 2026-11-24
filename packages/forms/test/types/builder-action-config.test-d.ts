import type { ActionConfigBase } from '@schema-engine/actions';
import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import type { FormActionConfig } from '@/actions/types';
import type { FormAuthoringAction } from '@/builder/form-authoring';
import type { BuilderActionConfig } from '@/types/registration';

const NoArguments = z.object({});
const Endpoint = z.object({ endpoint: z.string() });

expectTypeOf<BuilderActionConfig<'ping', typeof NoArguments>>().toEqualTypeOf<ActionConfigBase<'ping'>>();
expectTypeOf<BuilderActionConfig<'ping', typeof NoArguments>['id']>().toEqualTypeOf<string>();
expectTypeOf<BuilderActionConfig<'post', typeof Endpoint>>().toEqualTypeOf<
	ActionConfigBase<'post'> & { endpoint: string }
>();
expectTypeOf<BuilderActionConfig<'post', typeof Endpoint>['id']>().toEqualTypeOf<string>();

expectTypeOf<FormActionConfig<{ ping: Record<string, never> }>['id']>().toEqualTypeOf<string>();
expectTypeOf<FormActionConfig<{ post: { endpoint: string } }>>().toExtend<{ endpoint: string; id: string }>();

expectTypeOf<FormAuthoringAction<{ ping: Record<string, never> }>>().toEqualTypeOf<ActionConfigBase<'ping'>>();
expectTypeOf<{ $type: 'post'; id: string; endpoint: string }>().toExtend<
	FormAuthoringAction<{ post: { endpoint: string } }>
>();
