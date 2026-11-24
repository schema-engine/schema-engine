import * as z from 'zod/mini';
import {
	ActionDispatcher,
	ActionRegistry,
	defineAction,
	parseActions,
	type ActionConfigBase,
} from '@schema-engine/actions';

type Trigger = 'save';

interface Context {
	readonly sent: string[];
}

interface NotifyConfig extends ActionConfigBase<'notify'> {
	channel: string;
}

const defineNotify = defineAction<Context, Trigger>();

const notify = defineNotify<NotifyConfig>({
	$type: 'notify',
	schema: z.object({ channel: z.string() }),
	metadata: { name: 'Notify', defaultTriggers: ['save'] },
	execute: async ({ config, sent, signal }) => {
		if (signal.aborted) return { success: false, error: 'Cancelled' };
		sent.push(config.channel);
		return config.channel === 'broken'
			? { success: false, error: 'No such channel', shouldContinue: false }
			: { success: true };
	},
});

export const registry = new ActionRegistry<Context, Trigger>([notify]);

const dispatcher = new ActionDispatcher<Context, Trigger>(registry);

/** Parses a serialized sequence, then runs it for a trigger; the entry in brackets is a parallel group. */
export async function run(input: unknown, sent: string[]) {
	const parsed = parseActions(registry, input);
	if (!parsed.success) return { issues: parsed.issues };
	return { results: await dispatcher.dispatch({ actions: parsed.data, trigger: 'save', context: { sent } }) };
}
