import { describe, test, expect } from 'bun:test';
import { createActionSystem } from '../src/create-action-system';
import type { ActionConfigBase, ActionRegistration } from '../src/types';
import { z } from 'zod';

type TestTrigger = 'submit';

interface TestContext {
	id: string;
}

interface LogActionConfig extends ActionConfigBase<'log'> {
	message: string;
}

describe('createActionSystem', () => {
	test('returns wired registry and dispatcher', async () => {
		const { registry, dispatcher } = createActionSystem<TestContext, TestTrigger>();

		const logAction: ActionRegistration<LogActionConfig, TestContext, TestTrigger> = {
			$type: 'log',
			schema: z.object({
				id: z.string(),
				$type: z.literal('log'),
				message: z.string(),
			}),
			metadata: {
				name: 'Log Action',
				description: 'Logs a message',
				defaultTriggers: ['submit'],
			},
			execute: async () => ({ success: true }),
		};

		registry.register(logAction);

		const results = await dispatcher.dispatch({
			actions: [{ id: 'log-1', $type: 'log', message: 'hello' }],
			trigger: 'submit',
			context: { id: 'ctx-1' },
		});

		expect(registry.size).toBe(1);
		expect(results).toHaveLength(1);
		expect(results[0]?.success).toBe(true);
	});
});
