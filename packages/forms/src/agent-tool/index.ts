import { logger } from '@/lib/logger';
import { isPlainObject } from '@/lib/is-plain-object';
import { buildSubmissionShape, type SubmissionShape } from '@/lib/submission-shape';
import type { JSONSchemaObject } from '@/lib/standard-json-schema';
import type { FormEngineRuntime } from '@/engine/form-engine';
import type { SubmissionSchemaConfig } from '@/engine/submission-schema';
import type { FormRuntime, SubmitOutcome } from '@/runtime';
import { FORM_ROOT } from '@/state-container/types';
import type { FormStateIssue, FormSubmissionIssue } from '@/state-container/types';

/** What the page hands `execute` besides the input. */
interface AgentToolExecuteOptions {
	/** Aborted when the agent cancels the call. */
	readonly signal: AbortSignal;
}

/** The MCP shape of a tool result: what the agent reads. */
export interface FormAgentToolResult {
	readonly content: readonly [{ readonly type: 'text'; readonly text: string }];
}

interface ModelContext {
	registerTool(
		tool: {
			name: string;
			description: string;
			inputSchema: JSONSchemaObject;
			execute(input: unknown, options: AgentToolExecuteOptions): Promise<FormAgentToolResult>;
		},
		options: { signal: AbortSignal },
	): unknown;
}

/** The text of an issue for the form at `field.path`; `undefined` or an empty text says nothing worth showing. */
export type FormAgentIssueFormatter = (
	issue: FormStateIssue | FormSubmissionIssue,
	field: { readonly path: string },
) => string | undefined;

/** What {@link registerFormAgentTool} registers a form with. */
export interface FormAgentToolOptions {
	/** Unique among the page's tools; the browser rejects a duplicate. */
	name: string;
	description: string;
	/**
	 * Submits the form after filling it, for a form that only reads or changes something low risk and reversible.
	 *
	 * @remarks Without it the tool fills the form and reports that it waits for the user to submit, so a person confirms. Default: `false`.
	 */
	autoSubmit?: boolean;
	/** The engine the form was built with: its submission schema is the tool's input schema. */
	engine: Pick<FormEngineRuntime, 'submissionSchema' | 'getIssueFormatter'>;
	/** The normalized config the runtime was created from. */
	config: SubmissionSchemaConfig;
	/**
	 * The form's own issue formatter, such as the one `useFormContext()` or `FormController` gives.
	 *
	 * @remarks Default: the engine's. An issue with no text from either is reported by its own `message`, then its `type`.
	 */
	formatIssue?: FormAgentIssueFormatter;
}

const text = (value: string): FormAgentToolResult => ({ content: [{ type: 'text', text: value }] });

/** The description of a parameter: the field's label, then its help text. */
function describeElement(element: object | undefined): string | undefined {
	const { label, description } = (element ?? {}) as { label?: unknown; description?: unknown };
	const parts = [label, description].filter((part): part is string => typeof part === 'string' && part !== '');
	return parts.length > 0 ? parts.join(': ') : undefined;
}

/** `schema` with the labels and help text of the fields it describes, walked along the shape the schema was composed from. */
function withDescriptions(schema: JSONSchemaObject, shape: SubmissionShape): JSONSchemaObject {
	const described = describeElement(shape.element);
	const base = described ? { ...schema, description: described } : schema;
	if (shape.kind === 'array') {
		return base.items ? { ...base, items: withDescriptions(base.items as JSONSchemaObject, shape.row) } : base;
	}
	if (shape.kind === 'object') {
		const properties = (base.properties ?? {}) as Record<string, JSONSchemaObject>;
		return {
			...base,
			properties: Object.fromEntries(
				Object.entries(properties).map(([key, property]) => {
					const child = shape.fields[key];
					return [key, child ? withDescriptions(property, child) : property];
				}),
			),
		};
	}
	return base;
}

interface Write {
	readonly path: string;
	readonly kind: 'value' | 'rows';
	readonly value: unknown;
}

/** The writes that put `value` into the container: a leaf field takes its whole value, a list its whole rows. */
function collectWrites(shape: SubmissionShape, value: unknown, path: string, writes: Write[]): void {
	if (shape.kind === 'object') {
		if (!isPlainObject(value)) return;
		for (const [key, child] of Object.entries(shape.fields)) {
			if (Object.hasOwn(value, key) && value[key] !== undefined) {
				collectWrites(child, value[key], path === '' ? key : `${path}.${key}`, writes);
			}
		}
		return;
	}
	writes.push({ path, kind: shape.kind === 'array' ? 'rows' : 'value', value });
}

function writeTo(container: FormRuntime['container'], { path, kind, value }: Write): void {
	if (kind === 'rows') container.fieldArray(path).replace(Array.isArray(value) ? [...value] : []);
	else container.setValue(path, value);
}

/** The text of one issue: the formatter's, else the issue's own message, else its type, which an agent can still act on. */
function issueText(
	issue: FormStateIssue | FormSubmissionIssue,
	path: string,
	formatIssue: FormAgentIssueFormatter | undefined,
): string {
	return formatIssue?.(issue, { path }) || issue.message || issue.type;
}

function describeErrors(runtime: FormRuntime, formatIssue: FormAgentIssueFormatter | undefined): string[] {
	const lines = Object.entries(runtime.container.getSnapshot().errors).map(([path, error]) => {
		const reasons = [...new Set(error.all.map((issue) => issueText(issue, path, formatIssue)))];
		return `- ${path === FORM_ROOT ? 'form' : path}: ${reasons.join('; ')}`;
	});
	for (const failure of runtime.getSnapshot().submission.failures) {
		lines.push(`- form: ${issueText(failure, FORM_ROOT, formatIssue)}`);
	}
	return lines;
}

function reportOutcome(
	outcome: SubmitOutcome,
	runtime: FormRuntime,
	formatIssue: FormAgentIssueFormatter | undefined,
): string {
	switch (outcome) {
		case 'submitted':
			return 'The form was submitted.';
		case 'invalid':
		case 'failed': {
			const lines = describeErrors(runtime, formatIssue);
			return `The form was not submitted. Fix these and call the tool again:\n${lines.join('\n')}`;
		}
		case 'overtaken':
			return 'The form changed while it was checked, so it was not submitted. Call the tool again.';
		case 'busy':
			return 'The form is busy with another submission. Call the tool again in a moment.';
		default:
			return `The form could not be submitted (${outcome}). The values were filled in.`;
	}
}

/**
 * Registers a rendered form as a WebMCP tool, so a browser agent can fill it and, when the page allows, submit it.
 *
 * @param runtime - The form's runtime, which the renderer binding hands over (`useFormRuntime()` in React, `FormController` in Radiant).
 * @returns The function that unregisters the tool, by aborting the signal it registered with. Calling it again does nothing.
 * @experimental
 *
 * @remarks
 * WebMCP is an Origin Trial and its API may change. Nothing else in the package imports this entry.
 * It does nothing on the server and where the browser has no `document.modelContext`.
 *
 * The input schema is the JSON Schema of `engine.submissionSchema(config)`, with the label and help text of each
 * field as its description, and it throws when a value schema has no JSON Schema. `execute` first checks the input
 * against the same schema without requiring any key, so a value of the wrong type is refused before it reaches the form. It then writes the values into
 * the form's container, the way a person's edits arrive, and, when `autoSubmit` is set, runs `runtime.submit()`: the same
 * validation, constraints, value check, actions and `onSubmit` as a human submit. In a wizard it submits again after each
 * step it moves past, so the answers fill the steps they make active and a skipped step's values are not submitted.
 * A refused submission returns its issues as text, worded by the form's formatter, so the agent can retry.
 *
 * A call whose signal is aborted before it writes changes nothing. One aborted while it submits puts back the values and the
 * step the user had, unless the form was already submitted; errors the submission recorded stay.
 */
export function registerFormAgentTool(runtime: FormRuntime, options: FormAgentToolOptions): () => void {
	if (typeof document === 'undefined') return () => {};
	const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
	if (!modelContext) return () => {};

	const { name, description, autoSubmit = false, engine, config } = options;
	const formatIssue = options.formatIssue ?? engine.getIssueFormatter();
	const submission = engine.submissionSchema(config);
	const shape = buildSubmissionShape(config.steps);
	const inputSchema = withDescriptions(
		{ ...submission['~standard'].jsonSchema.input({ target: 'draft-2020-12' }) },
		shape,
	);

	const execute = async (input: unknown, { signal }: AgentToolExecuteOptions): Promise<FormAgentToolResult> => {
		if (signal.aborted) return text('The call was cancelled before the form was changed.');

		const checked = submission.partial['~standard'].validate(input);
		if (checked.issues) {
			const lines = checked.issues.map(
				(issue) =>
					`- ${(issue.path ?? []).map((segment) => String(typeof segment === 'object' ? segment.key : segment)).join('.') || 'input'}: ${issue.message}`,
			);
			return text(`The input does not match the form, so nothing was filled in:\n${lines.join('\n')}`);
		}

		const { container } = runtime;
		const startStep = runtime.getSnapshot().current;
		const writes: Write[] = [];
		collectWrites(shape, checked.value, '', writes);
		const before = writes.map((write) => ({ ...write, value: container.getValue(write.path) }));
		for (const write of writes) writeTo(container, write);

		if (!autoSubmit) {
			return text('The form is filled in and waits for the user to review and submit it.');
		}

		let outcome: SubmitOutcome = 'refused';
		for (let step = 0; step <= runtime.getSnapshot().steps.length; step += 1) {
			outcome = await runtime.submit();
			if (outcome !== 'moved') break;
			if (signal.aborted) break;
		}
		if (signal.aborted && outcome !== 'submitted') {
			for (const write of before.toReversed()) writeTo(container, write);
			await runtime.goTo(startStep);
			return text('The call was cancelled, so the form was put back as the user had it.');
		}
		return text(reportOutcome(outcome, runtime, formatIssue));
	};

	const controller = new AbortController();
	void (async () => {
		try {
			await modelContext.registerTool({ name, description, inputSchema, execute }, { signal: controller.signal });
		} catch (error) {
			if (!controller.signal.aborted) logger.error(`Could not register the agent tool "${name}".`, { error });
		}
	})();
	return () => controller.abort();
}
