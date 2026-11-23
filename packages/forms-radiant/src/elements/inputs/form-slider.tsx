import { bindTo, customElement, prop, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAriaBindings, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { ControlHost, registerHostControl } from '@/lib/control-host';
import { FieldGroup } from '../field-group';
import type { SliderFieldProps } from './form-slider.types';

/** The selector of the control's own ARIA target: where the field paints its label, description and state. */
const ARIA_TARGET = '[data-thumb="value"]';

/**
 * @remarks
 * `value` is the number of the one thumb, while `rui-slider` holds a list of numbers. It is `undefined` until
 * the form or the user writes one, and the control shows its default meanwhile.
 */
@customElement('se-slider', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': ARIA_TARGET },
})
export class SeSlider extends ControlHost<number | undefined, number[]> {
	declare readonly [JSX_PROPS]?: Partial<
		Pick<SeSlider, 'name' | 'disabled' | 'value' | 'min' | 'max' | 'step' | 'orientation'>
	>;

	/** The field's context, painted onto the `ARIA_TARGET` by `fieldAriaBindings` (see `ControlHost`). */
	@contextSelector({ context: fieldContext })
	@state
	@bindTo(fieldAriaBindings(ARIA_TARGET))
	protected field?: FieldContextValue = undefined;

	@prop({ type: Number, defaultValue: undefined }) value: number | undefined = undefined;
	@prop({ type: Number, defaultValue: 0 }) min = 0;
	@prop({ type: Number, defaultValue: 100 }) max = 100;
	@prop({ type: Number, defaultValue: 1 }) step = 1;
	@prop({ type: String }) orientation: 'horizontal' | 'vertical' = 'horizontal';

	protected get controlTag(): string {
		return 'rui-slider';
	}

	protected override toControl(value: number | undefined): number[] {
		return typeof value === 'number' ? [value] : [];
	}

	protected override fromControl(held: unknown): number | undefined {
		const thumb = Array.isArray(held) ? held[0] : held;
		return typeof thumb === 'number' ? thumb : undefined;
	}

	override render(): JsxRenderable {
		return (
			<RuiSlider
				name={this.name}
				min={this.min}
				max={this.max}
				step={this.step}
				orientation={this.orientation}
				disabled={this.disabled}
				showValue
				value={this.toControl(this.value)}
			/>
		);
	}
}

registerHostControl('se-slider', { mode: 'wraps' });

export function FormSlider(config: SliderFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			authoredRequired={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			class={config.className}
			style={config.style}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<SeSlider
				name={config.name}
				min={config.min ?? 0}
				max={config.max ?? 100}
				step={config.step ?? 1}
				orientation={config.orientation}
				disabled={config.disabled}
				value={config.defaultValue}
			/>
		</FieldGroup>
	);
}
