/**
 * Tells the field a registered host's `value` changed through user input.
 *
 * @remarks
 * Dispatches the native `input` event on the host, which `rui-field` reads to write the host's `value`
 * into the form, so update `value` first. `commit` also dispatches `change`, once, for a change that is
 * final (a paste, a drop, a pick, a field's `change`). Setting `value` from code dispatches nothing.
 */
export function emitControlChange(host: HTMLElement, options: { commit?: boolean } = {}): void {
	host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
	if (options.commit) emitControlCommit(host);
}

/** Dispatches the native `change` event on a registered host whose value the user committed. */
export function emitControlCommit(host: HTMLElement): void {
	host.dispatchEvent(new Event('change', { bubbles: true }));
}
