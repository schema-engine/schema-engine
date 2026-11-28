import { expectTypeOf } from 'vitest';
import { ActionDispatcher } from '../src/dispatcher';
import { parseActions } from '../src/parse-actions';
import { createRegistry } from '@schema-engine/registry';
import type { ActionConfigBase, ActionRegistration, ParsedAction, ParsedActionSequence } from '../src/types';

const registry = createRegistry('Action', [] as ActionRegistration[]);
const dispatcher = new ActionDispatcher(registry);
const raw = [{ id: 'a', $type: 'post' }];

// @ts-expect-error raw object literals are not parsed actions
void dispatcher.dispatch({ actions: [{ id: 'a', $type: 'post' }], trigger: 'submit', context: {} });
// @ts-expect-error a typed config is not a parsed action
void dispatcher.dispatch({ actions: raw satisfies ActionConfigBase[], trigger: 'submit', context: {} });
// @ts-expect-error hasMatching takes parsed actions too
dispatcher.hasMatching(raw, 'submit');

const result = parseActions(registry, raw);
if (result.success) {
	expectTypeOf(result.data).toEqualTypeOf<ParsedActionSequence>();
	void dispatcher.dispatch({ actions: result.data, trigger: 'submit', context: {} });
	dispatcher.hasMatching(result.data, 'submit');
	expectTypeOf(result.data[0]).toExtend<ParsedAction | readonly ParsedAction[] | undefined>();
}
