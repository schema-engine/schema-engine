import { findFieldControl } from '@ecopages/radiant-ui/form';

const FOCUSABLE =
	'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focuses the control of the first field, in document order, whose `name` is one of `paths`.
 *
 * @remarks
 * Works outside a submit, unlike the `focus` that `rui-form` hands its submit handler: a wizard moves
 * to the step that has the error and focuses it. A control that is not itself focusable (a group of
 * checkboxes or radios) hands focus to its first enabled focusable descendant.
 */
export function focusFirstField(root: ParentNode, paths: readonly string[]): void {
	for (const field of root.querySelectorAll<HTMLElement>('se-field[name], rui-field[name]')) {
		const name = field.getAttribute('name');
		if (!name || !paths.includes(name)) continue;
		const control = findFieldControl(field);
		if (!control) continue;
		const target = control.matches(FOCUSABLE) ? control : control.querySelector<HTMLElement>(FOCUSABLE);
		(target ?? control).focus();
		return;
	}
}
