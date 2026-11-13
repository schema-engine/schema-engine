/**
 * One problem a layout check found, shaped like a Standard Schema issue.
 *
 * @remarks
 * `path` is relative to the thing that was checked (an authored `appearance`, a recipe view), so the
 * domain prefixes the location of that thing in its own document. The message does not repeat the
 * path.
 */
export interface LayoutIssue {
	readonly message: string;
	readonly path: ReadonlyArray<PropertyKey>;
}
