/**
 * Static previews of the example forms.
 *
 * Each example page on the docs site shows a real, runnable HTML form
 * mirroring the @schema-engine/forms config that drives it. This
 * gives readers a real visual to anchor the JSON config and the
 * React component, without requiring a client-side renderer.
 */
import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

const cn = (...classes: (string | false | undefined)[]) =>
	classes.filter(Boolean).join(' ');

const Field = ({
	id,
	label,
	hint,
	error,
	children,
}: {
	id: string;
	label: string;
	hint?: string;
	error?: string;
	children: JsxRenderable;
}) => (
	<div class="flex flex-col gap-1.5">
		<label for={id} class="block text-sm font-medium text-on-background">
			{label}
		</label>
		{children}
		{hint && !error ? <p class="text-xs text-on-background/55 m-0">{hint}</p> : null}
		{error ? <p class="text-xs text-destructive m-0">{error}</p> : null}
	</div>
);

const Input = ({
	id,
	name,
	type = 'text',
	placeholder,
	required = false,
	defaultValue,
}: {
	id: string;
	name: string;
	type?: 'text' | 'email' | 'number';
	placeholder?: string;
	required?: boolean;
	defaultValue?: string | number;
}) => (
	<input
		id={id}
		name={name}
		type={type}
		placeholder={placeholder}
		required={required}
		value={defaultValue as 'safe' | undefined}
		class="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-on-background placeholder:text-on-background/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
	/>
);

const Textarea = ({
	id,
	name,
	placeholder,
	required = false,
	rows = 4,
}: {
	id: string;
	name: string;
	placeholder?: string;
	required?: boolean;
	rows?: number;
}) => (
	<textarea
		id={id}
		name={name}
		placeholder={placeholder}
		required={required}
		rows={rows}
		class="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-on-background placeholder:text-on-background/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
	/>
);

const Select = ({
	id,
	name,
	required = false,
	options,
	defaultValue,
}: {
	id: string;
	name: string;
	required?: boolean;
	options: Array<{ value: string; label: string }>;
	defaultValue?: string;
}) => (
	<select
		id={id}
		name={name}
		required={required}
		class="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-on-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
	>
		{options.map((opt) => (
			<option value={opt.value} selected={opt.value === defaultValue}>
				{opt.label}
			</option>
		))}
	</select>
);

const Submit = ({ label = 'Submit' }: { label?: string }) => (
	<button
		type="submit"
		class="inline-flex items-center justify-center rounded-sm bg-primary text-on-primary px-4 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
	>
		{label}
	</button>
);

const FormShell = ({
	id,
	children,
}: {
	id: string;
	children: JsxRenderable;
}) => (
	<form
		id={id}
		class={cn(
			'flex flex-col gap-4 p-5 max-w-xl',
			'rounded-md border border-border bg-background',
		)}
		action="#"
		method="post"
		onsubmit="event.preventDefault(); alert('This is a static preview. The same JSON drives a real <FormRenderer /> in your React app.');"
	>
		{children}
	</form>
);

/* — Previews — */

export const BasicFormPreview = () => (
	<FormShell id="preview-basic">
		<Field id="preview-basic-name" label="Full Name" hint="2–50 characters">
			<Input id="preview-basic-name" name="name" placeholder="Ada Lovelace" required />
		</Field>
		<Field id="preview-basic-email" label="Email Address">
			<Input
				id="preview-basic-email"
				name="email"
				type="email"
				placeholder="ada@example.com"
				required
			/>
		</Field>
		<Field id="preview-basic-age" label="Age" hint="18–120">
			<Input id="preview-basic-age" name="age" type="number" placeholder="36" />
		</Field>
		<Field id="preview-basic-country" label="Country">
			<Select
				id="preview-basic-country"
				name="country"
				options={[
					{ value: '', label: 'Select a country…' },
					{ value: 'us', label: 'United States' },
					{ value: 'it', label: 'Italy' },
					{ value: 'uk', label: 'United Kingdom' },
				]}
			/>
		</Field>
		<Field id="preview-basic-message" label="Notes">
			<Textarea
				id="preview-basic-message"
				name="message"
				rows={3}
				placeholder="Optional context…"
			/>
		</Field>
		<div class="flex items-center gap-3">
			<Submit label="Submit" />
			<button
				type="reset"
				class="text-sm text-on-background/60 hover:text-on-background underline underline-offset-4"
			>
				Reset
			</button>
		</div>
	</FormShell>
);

export const ContactFormPreview = () => (
	<FormShell id="preview-contact">
		<Field id="preview-contact-email" label="Email Address">
			<Input
				id="preview-contact-email"
				name="email"
				type="email"
				placeholder="you@example.com"
				required
			/>
		</Field>
		<Field id="preview-contact-message" label="Message">
			<Textarea
				id="preview-contact-message"
				name="message"
				rows={5}
				placeholder="Tell us what you're building…"
				required
			/>
		</Field>
		<div class="flex items-center justify-between gap-3">
			<p class="text-xs text-on-background/60 m-0">Driven by the JSON config on the right.</p>
			<Submit label="Submit Form" />
		</div>
	</FormShell>
);

export const RegistrationFormPreview = () => (
	<FormShell id="preview-registration">
		<div class="flex items-center justify-between">
			<p class="text-xs font-mono text-on-background/55 m-0">Step 1 of 3</p>
			<div class="flex gap-1.5">
				<span class="w-2 h-2 rounded-full bg-primary" />
				<span class="w-2 h-2 rounded-full bg-border" />
				<span class="w-2 h-2 rounded-full bg-border" />
			</div>
		</div>
		<Field id="preview-reg-fullName" label="Full Name">
			<Input
				id="preview-reg-fullName"
				name="fullName"
				placeholder="Grace Hopper"
				required
			/>
		</Field>
		<Field id="preview-reg-email" label="Email Address">
			<Input
				id="preview-reg-email"
				name="email"
				type="email"
				placeholder="grace@example.com"
				required
			/>
		</Field>
		<Field id="preview-reg-password" label="Password" hint="At least 8 characters">
			<Input
				id="preview-reg-password"
				name="password"
				type="text"
				placeholder="••••••••"
				required
			/>
		</Field>
		<div class="flex items-center justify-end gap-3">
			<button
				type="button"
				class="text-sm text-on-background/60 hover:text-on-background underline underline-offset-4"
			>
				Back
			</button>
			<Submit label="Continue" />
		</div>
	</FormShell>
);

export const SurveyFormPreview = () => (
	<FormShell id="preview-survey">
		<div class="flex items-center justify-between">
			<p class="text-xs font-mono text-on-background/55 m-0">Question 1 of 3</p>
			<div class="h-1.5 flex-1 mx-3 rounded-full bg-border overflow-hidden">
				<div class="h-full w-1/3 bg-primary" />
			</div>
		</div>
		<Field id="preview-survey-satisfaction" label="Overall, how satisfied are you with our service?">
			<Select
				id="preview-survey-satisfaction"
				name="satisfaction"
				options={[
					{ value: '5', label: 'Very satisfied' },
					{ value: '4', label: 'Satisfied' },
					{ value: '3', label: 'Neutral' },
					{ value: '2', label: 'Dissatisfied' },
					{ value: '1', label: 'Very dissatisfied' },
				]}
				required
			/>
		</Field>
		<Field id="preview-survey-recommend" label="Would you recommend us to a friend?">
			<Select
				id="preview-survey-recommend"
				name="recommend"
				options={[
					{ value: 'yes', label: 'Definitely' },
					{ value: 'maybe', label: 'Maybe' },
					{ value: 'no', label: 'No' },
				]}
				required
			/>
		</Field>
		<div class="flex items-center justify-end gap-3">
			<button
				type="button"
				class="text-sm text-on-background/60 hover:text-on-background underline underline-offset-4"
			>
				Back
			</button>
			<Submit label="Next" />
		</div>
	</FormShell>
);

const Body = ({ preview }: { preview: string }) => {
	switch (preview) {
		case 'basic':
			return <BasicFormPreview />;
		case 'contact':
			return <ContactFormPreview />;
		case 'registration':
			return <RegistrationFormPreview />;
		case 'survey':
			return <SurveyFormPreview />;
		default:
			return <ContactFormPreview />;
	}
};

export const ExampleFormPreview = eco.component<{ preview: string }, JsxRenderable>({
	render: ({ preview }) => <Body preview={preview} />,
});
