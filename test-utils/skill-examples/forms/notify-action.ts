import * as z from 'zod/mini';
import { defineAction, type ActionConfigBase } from '@schema-engine/actions';
import { createFormEngine, type BuilderActionBaseContext, type FormActionTrigger } from '@schema-engine/forms';
import { textRegistration } from './engine';

const defineFormAction = defineAction<BuilderActionBaseContext, FormActionTrigger>();

interface NotifyConfig extends ActionConfigBase<'notify'> {
	channel: string;
}

export const notifyAction = defineFormAction<NotifyConfig>({
	$type: 'notify',
	schema: z.object({ channel: z.string() }),
	metadata: { name: 'Notify', defaultTriggers: ['form_submit'] },
	execute: async ({ config, formData, fetch }) => {
		const response = await fetch('/api/notify', {
			method: 'POST',
			body: JSON.stringify({ channel: config.channel, formData }),
		});
		return response.ok ? { success: true } : { success: false, error: `Notify failed with ${response.status}` };
	},
});

export const notifyEngine = createFormEngine({ elements: [textRegistration], actions: [notifyAction] });

export const notifyForm = notifyEngine.defineForm({
	id: 'notify',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'text', name: 'email' }] }],
	actions: [{ $type: 'notify', id: 'notify-ops', channel: 'ops' }],
});
