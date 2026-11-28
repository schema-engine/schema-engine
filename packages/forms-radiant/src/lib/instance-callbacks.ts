import type { FormActionTrigger, FormValues, SubmissionActionResult } from '@schema-engine/forms';
import type { FormAction, FormSubmitContext } from '@/adapters/types.js';

/** The callbacks of an application's `FormRenderer`, as a form instance calls them. */
export interface InstanceCallbacks<TValues extends FormValues = FormValues> {
	onSubmit?: (data: TValues, context: FormSubmitContext) => void | Promise<void>;
	onChange?: (data: FormValues) => void;
	onAction?: (action: FormAction, data: TValues) => void | Promise<void>;
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	navigate?: (url: string) => void;
}

const callbacks = new WeakMap<Element, InstanceCallbacks>();

/**
 * Hands the callbacks of a `FormRenderer` to its `se-form-instance`, the way the view's `ref` does, so the element has no property for an application to assign.
 *
 * @remarks
 * This is the one place the values type is asserted for the callbacks. The instance builds its runtime from a config it
 * knows only as `FormValues`, and the runtime parses every submission against the config before a callback receives it,
 * so a callback typed by the values of its form takes what the runtime hands over. A form rendered on the server has no
 * callback until the application renders it with one.
 */
export function feedInstanceCallbacks<TValues extends FormValues>(
	instance: Element,
	given: InstanceCallbacks<TValues>,
): void {
	callbacks.set(instance, given as unknown as InstanceCallbacks);
}

/** The callbacks the view fed to an instance, none until it did. */
export function instanceCallbacks(instance: Element): InstanceCallbacks {
	return callbacks.get(instance) ?? {};
}
