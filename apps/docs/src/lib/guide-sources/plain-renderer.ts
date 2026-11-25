import {
	createFormRuntime,
	type FormEngineRuntime,
	type FormValues,
	type NormalizedFormConfig,
} from '@schema-engine/forms';
import { issueText } from '@schema-engine/forms/state-container';

/**
 * Draws the first step of a form into `root`: a text field and an error for each element, and a submit button.
 *
 * @returns Stops the form: the runtime revokes any command in flight, and the markup is removed.
 *
 * @remarks
 * The runtime owns the values, the validation and the submission. This renderer only forwards what the user did to the
 * container and paints what the container reports. It needs no `sync`, because every control writes to the
 * container as the user types.
 */
export function renderForm(
	engine: FormEngineRuntime,
	config: NormalizedFormConfig,
	root: HTMLElement,
	onSubmit: (values: FormValues) => void,
): () => void {
	const form = document.createElement('form');
	form.noValidate = true;

	const runtime = createFormRuntime({
		engine,
		config,
		onSubmit,
		host: {
			focus: (paths) =>
				form.querySelector<HTMLElement>(paths.map((path) => `[name="${path}"]`).join(','))?.focus(),
		},
	});
	const { container } = runtime;
	const errors = new Map<string, HTMLElement>();

	for (const element of config.steps[0]?.elements ?? []) {
		const label = document.createElement('label');
		const control = document.createElement('input');
		control.name = element.name;
		control.addEventListener('input', () => container.setValue(element.name, control.value));
		control.addEventListener('blur', () => container.blur(element.name));
		const error = document.createElement('p');
		error.role = 'alert';
		errors.set(element.name, error);
		label.append(element.label ?? element.name, control);
		form.append(label, error);
	}

	const submit = document.createElement('button');
	submit.textContent = 'Send';
	form.append(submit);
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		void runtime.submit();
	});

	const paint = () => {
		const { errors: issues } = container.getSnapshot();
		for (const [name, output] of errors) {
			const issue = issues[name];
			output.textContent = (issue && issueText(issue, name, runtime.formatIssue)) ?? '';
		}
	};
	const unsubscribe = container.subscribe(paint);
	const unmount = runtime.mount();

	root.append(form);
	return () => {
		unsubscribe();
		unmount();
		form.remove();
	};
}
