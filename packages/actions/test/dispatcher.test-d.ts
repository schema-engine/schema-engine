import { createRegistry } from '@schema-engine/registry';
import * as z from 'zod/mini';
import { ActionDispatcher } from '../src/dispatcher';
import { parseActions } from '../src/parse-actions';
import { defineAction } from '../src/types';

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
