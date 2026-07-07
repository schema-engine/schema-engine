import type { ActionRegistryProvider } from '../../src/registry';
import type { ActionRegistration, ActionConfigBase } from '../../src/types';

export type TestTrigger = 'mount' | 'change' | 'submit' | 'complete' | 'error';

export interface TestContext {
	id: string;
	data: Record<string, unknown>;
	timestamp: number;
}

export interface TestActionConfig extends ActionConfigBase {
	name: string;
	value?: unknown;
}

export function createContext(overrides: Partial<TestContext> = {}): TestContext {
	return {
		id: 'test-1',
		data: {},
		timestamp: Date.now(),
		...overrides,
	};
}

export class MockActionRegistry implements ActionRegistryProvider<TestContext, TestTrigger> {
	private actions = new Map<string, ActionRegistration<TestActionConfig, TestContext, TestTrigger>>();

	register(action: ActionRegistration<TestActionConfig, TestContext, TestTrigger>): void {
		this.actions.set(action.$type, action);
	}

	getAction(type: string): ActionRegistration<TestActionConfig, TestContext, TestTrigger> | undefined {
		return this.actions.get(type);
	}

	getActionTypes(): string[] {
		return Array.from(this.actions.keys());
	}

	clear(): void {
		this.actions.clear();
	}
}
