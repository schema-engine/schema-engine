import { formatIssuePath } from '@schema-engine/registry';
import type { FormValidationIssue } from './issues';

/**
 * Thrown by {@link validateFormConfig} when a form does not validate.
 *
 * @param issues Every problem the checks found, each with the config path it is about.
 * @param source The authored config the paths point into. It only decorates `message` with the ids
 * of the elements and actions a path passes; `issues` stay as they are.
 *
 * @remarks
 * `message` lists the issues one per line as `<path>: <message>`, so a log reads without parsing
 * `issues`. Use `safeValidateForm` on the engine to get the same issues as a result instead of an
 * exception.
 */
export class FormValidationError extends Error {
	readonly issues: readonly FormValidationIssue[];

	constructor(issues: readonly FormValidationIssue[], source?: unknown) {
		super(
			issues.length > 0
				? issues
						.map((issue) => {
							const path = formatIssuePath(issue.path, source);
							return path ? `${path}: ${issue.message}` : issue.message;
						})
						.join('\n')
				: 'Invalid form configuration',
		);
		this.name = 'FormValidationError';
		this.issues = issues;
	}
}
