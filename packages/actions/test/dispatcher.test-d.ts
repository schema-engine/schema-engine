import { createMutableRegistry, createRegistry } from '@schema-engine/registry';
import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import { ActionDispatcher } from '../src/dispatcher';
import { parseActions } from '../src/parse-actions';
import { defineAction, type ActionConfigBase, type AnyActionRegistration } from '../src/types';

interface Context {
	formId: string;
}
type Trigger = 'submit' | 'change';

const defineSend = defineAction<Context, Trigger>();
const send = defineSend({
	$type: 'send',
	schema: z.object({ $type: z.literal('send'), channel: z.string() }),
	metadata: { name: 'Send', defaultTriggers: ['submit'] },
	execute: () => ({ success: true }),
});
const registry = createRegistry('Action', [send]);
const dispatcher = new ActionDispatcher(registry);
const parsed = parseActions(registry, []);
const actions = parsed.success ? parsed.data : [];

void dispatcher.dispatch({ actions, trigger: 'submit', context: { formId: 'checkout' } });
dispatcher.hasMatching(actions, 'change');

// @ts-expect-error the context is not the Context the registrations fix
void dispatcher.dispatch({ actions, trigger: 'submit', context: { formId: 1 } });
// @ts-expect-error the trigger is not one of the Trigger the registrations fix
void dispatcher.dispatch({ actions, trigger: 'launch', context: { formId: 'checkout' } });
// @ts-expect-error the trigger is not one of the Trigger the registrations fix
dispatcher.hasMatching(actions, 'launch');

parseActions({ get: () => undefined, hint: 'Register it in plugins.ts.' }, []);
// @ts-expect-error the hint belongs to the lookup, not to the options
parseActions(registry, [], { hint: 'Register it in plugins.ts.' });

interface AuditConfig extends ActionConfigBase<'audit'> {
	note: string;
}
interface PingConfig extends ActionConfigBase<'ping'> {
	url: string;
}

const mutable = createMutableRegistry<AnyActionRegistration<Context, Trigger>>('Action');
mutable.register(
	defineSend<AuditConfig>({
		$type: 'audit',
		schema: z.object({ note: z.string() }),
		metadata: { name: 'Audit', defaultTriggers: ['submit'] },
		execute: ({ config }) => ({ success: Boolean(config.note) }),
	}),
);
mutable.register(
	defineSend<PingConfig>({
		$type: 'ping',
		schema: z.object({ url: z.string() }),
		metadata: { name: 'Ping', defaultTriggers: ['change'] },
		execute: ({ config }) => ({ success: Boolean(config.url) }),
	}),
);
const mutableDispatcher = new ActionDispatcher(mutable);

void mutableDispatcher.dispatch({ actions, trigger: 'submit', context: { formId: 'checkout' } });
// @ts-expect-error the context is not the Context the registry fixes
void mutableDispatcher.dispatch({ actions, trigger: 'submit', context: { formId: 1 } });
// @ts-expect-error the trigger is not one of the Trigger the registry fixes
void mutableDispatcher.dispatch({ actions, trigger: 'launch', context: { formId: 'checkout' } });

declare const anyAction: AnyActionRegistration<Context, Trigger>;
expectTypeOf(anyAction.$type).toEqualTypeOf<string>();
