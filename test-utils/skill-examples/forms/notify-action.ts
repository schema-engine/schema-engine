import * as z from 'zod/mini';
import { createFormEngine, type BuilderActionRegistration } from '@schema-engine/forms';
import { textRegistration } from './engine';

const NotifyActionSchema = z.object({ channel: z.string() });

export const notifyAction: BuilderActionRegistration<'notify', typeof NotifyActionSchema> = {
	$type: 'notify',
	schema: NotifyActionSchema,
	metadata: { name: 'Notify', defaultTriggers: ['form_submit'] },
	execute: async ({ config, formData, fetch }) => {
		const response = await fetch('/api/notify', {
			method: 'POST',
			body: JSON.stringify({ channel: config.channel, formData }),
		});
		return response.ok ? { success: true } : { success: false, error: `Notify failed with ${response.status}` };
	},
};

export const notifyEngine = createFormEngine({ elements: [textRegistration], actions: [notifyAction] });

export const notifyForm = notifyEngine.defineForm({
	id: 'notify',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'text', name: 'email' }] }],
	actions: [{ $type: 'notify', id: 'notify-ops', channel: 'ops' }],
});
