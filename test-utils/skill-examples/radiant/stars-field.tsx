import * as z from 'zod/mini';
import { customElement, prop } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { announceControlConnect, registerFieldControl } from '@ecopages/radiant-ui/form';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { FormField } from '@schema-engine/forms-radiant/primitives';

@customElement('example-stars')
export class ExampleStars extends FormAssociatedElement {
	declare readonly [JSX_PROPS]?: Partial<Pick<ExampleStars, 'name' | 'value' | 'max'>>;

	@prop({ type: Number, defaultValue: 0 }) value = 0;
	@prop({ type: Number, defaultValue: 5 }) max = 5;

	protected override formValue(): FormValue {
		return String(this.value);
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = Number(state) || 0;
	}

	protected override onConnected(): void {
		super.onConnected();
		announceControlConnect(this);
	}

	private choose(value: number): void {
		this.value = value;
		this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
		this.dispatchEvent(new Event('change', { bubbles: true }));
	}

	override render(): JsxRenderable {
		return (
			<fieldset>
				{Array.from({ length: this.max }, (_, index) => (
					<button
						type="button"
						aria-pressed={this.value === index + 1}
						aria-label={`${index + 1} stars`}
						on:click={() => this.choose(index + 1)}
					/>
				))}
			</fieldset>
		);
	}
}

registerFieldControl('example-stars', {
	read: (host) => (host as ExampleStars).value,
	write: (host, value) => {
		(host as ExampleStars).value = Number(value) || 0;
	},
	submission: 'none',
});

const StarsFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('stars'),
	max: z._default(z.number().check(z.int(), z.positive()), 5),
});

function StarsField(config: z.output<typeof StarsFieldSchema>) {
	return (
		<FormField name={config.name}>
			<RuiLabel htmlFor={config.id}>{config.label}</RuiLabel>
			<ExampleStars name={config.name} max={config.max} />
			<RuiFieldError />
		</FormField>
	);
}

export const starsFieldRegistration = defineInput({
	$type: 'stars',
	schema: StarsFieldSchema,
	metadata: { name: 'Stars', category: 'input' },
	render: StarsField,
});
