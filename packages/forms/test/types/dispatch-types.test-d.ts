import type {
	// @ts-expect-error the dispatch types come from @schema-engine/actions only
	ActionDispatchInput,
	// @ts-expect-error the dispatch types come from @schema-engine/actions only
	ActionDispatchResult,
	// @ts-expect-error the dispatcher comes from @schema-engine/actions only
	ActionDispatcher,
} from '@/index';
// @ts-expect-error the dispatch types come from @schema-engine/actions only
import type { ActionDispatchInput as FromActions } from '@/actions';
// @ts-expect-error the dispatcher comes from @schema-engine/actions only
import type { ActionDispatcher as FromEngine } from '@/engine';

export type Unused = [ActionDispatchInput, ActionDispatchResult, ActionDispatcher, FromActions, FromEngine];
