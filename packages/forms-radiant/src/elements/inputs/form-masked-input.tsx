import './form-masked-input.css';
import { bindTo, onUpdated, prop, query, state } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import {
	emitControlChange,
	fieldControlHostAttributes,
	registerValueControl,
	syncFieldControl,
} from '@/lib/field-control';
import { FieldGroup } from '../field-group';
import {
	createPatternMaskOptions,
	getMaskedInputPlaceholder,
	loadIMask,
	parseUnmaskMode,
	readMaskValue,
} from '@/lib/mask-options';
import type { MaskedInputFieldProps } from './form-masked-input.types';
import { formElement } from '@/lib/define-element';

/**
 * @remarks
 * `value` is what the field submits: the masked text, the unmasked text or the
 * typed value, as `unmask` selects. IMask owns the visible text, so a write to
 * `value` is pushed into the mask instance instead of rendered.
 */
@formElement('se-masked-input', { hostAttributes: fieldControlHostAttributes('[data-ref="input"]') })
export class SeMaskedInput extends FormAssociatedElement {
	declare readonly [JSX_PROPS]?: Partial<
		Pick<
			SeMaskedInput,
			| 'name'
			| 'disabled'
			| 'value'
			| 'inputId'
			| 'mask'
			| 'unmask'
			| 'placeholder'
			| 'autoComplete'
			| 'inputMode'
			| 'placeholderChar'
			| 'lazy'
			| 'overwrite'
			| 'autoFocus'
			| 'definitions'
		>
	>;

	@prop({ type: String }) value = '';
	@prop({ type: String }) inputId = '';
	@prop({ type: String }) mask = '';
	@prop({ type: String }) unmask = '';
	@prop({ type: String }) placeholder = '';
	@prop({ type: String }) autoComplete = '';
	@prop({ type: String }) inputMode = '';
	@prop({ type: String }) placeholderChar = '';
	@prop({ type: Boolean, defaultValue: true }) lazy = true;
	@prop({ type: Boolean, defaultValue: false }) overwrite = false;
	@prop({ type: Boolean, defaultValue: false }) autoFocus = false;
	@prop({ type: Object }) definitions?: Record<string, string>;

	@state @bindTo({ bool: 'data-ready' }) protected ready = false;

	@query({ ref: 'input' }) input!: HTMLInputElement | null;

	private maskInstance: import('imask').InputMask<import('@/lib/mask-options').PatternMaskOptions> | null = null;
	private attachGeneration = 0;
	private applyingValue = false;

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = typeof state === 'string' ? state : '';
	}

	protected override onConnected(): void {
		syncFieldControl(this);
		void this.attachMask();
		this.registerCleanupCallback(() => {
			this.attachGeneration += 1;
			this.destroyMask();
		});
	}

	@onUpdated(['mask', 'unmask', 'lazy', 'overwrite', 'placeholderChar', 'definitions'])
	onMaskConfigUpdated(): void {
		void this.attachMask();
	}

	@onUpdated(['value'])
	onValueUpdated(): void {
		this.applyValue();
	}

	private maskConfig() {
		return createPatternMaskOptions({
			mask: this.mask,
			lazy: this.lazy,
			overwrite: this.overwrite,
			placeholderChar: this.placeholderChar || undefined,
			definitions: this.definitions,
		});
	}

	private async attachMask() {
		if (!this.mask) {
			return;
		}

		const generation = ++this.attachGeneration;
		const IMask = await loadIMask();
		if (generation !== this.attachGeneration || !this.isConnected || !this.input) {
			return;
		}

		if (this.maskInstance) {
			this.maskInstance.updateOptions(this.maskConfig());
		} else {
			this.maskInstance = IMask(this.input, this.maskConfig());
			this.maskInstance.on('accept', this.onAccept);
		}
		this.applyValue();
		this.ready = true;
	}

	private destroyMask() {
		this.maskInstance?.destroy();
		this.maskInstance = null;
		this.ready = false;
	}

	private readonly onAccept = () => {
		if (!this.maskInstance || this.applyingValue) {
			return;
		}

		const next = readMaskValue(this.maskInstance, parseUnmaskMode(this.unmask));
		if (next === this.value) {
			return;
		}

		this.value = next;
		emitControlChange(this, next);
	};

	private applyValue() {
		const instance = this.maskInstance;
		const mode = parseUnmaskMode(this.unmask);
		if (!instance || readMaskValue(instance, mode) === this.value) {
			return;
		}

		this.applyingValue = true;
		try {
			if (mode === 'typed') {
				instance.typedValue = this.value;
			} else if (mode) {
				instance.unmaskedValue = this.value;
			} else {
				instance.value = this.value;
			}
		} finally {
			this.applyingValue = false;
		}
	}

	override render(): JsxRenderable {
		return (
			<div class="se-masked">
				<input
					id={this.inputId || undefined}
					data-ref="input"
					class="rui-input se-masked__input"
					type="text"
					placeholder={getMaskedInputPlaceholder(this.mask, this.placeholder)}
					autocomplete={this.autoComplete || undefined}
					inputmode={this.inputMode || undefined}
					autofocus={this.autoFocus}
					disabled={this.effectiveDisabled}
					spellcheck={false}
				/>
			</div>
		);
	}
}

registerValueControl('se-masked-input');

export function FormMaskedInput(config: MaskedInputFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			style={config.style}
			validation={config}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<SeMaskedInput
				name={config.name}
				placeholder={config.placeholder}
				disabled={config.disabled}
				inputId={config.id ?? ''}
				mask={config.mask}
				unmask={config.unmask === 'typed' ? 'typed' : config.unmask ? 'true' : ''}
				lazy={config.lazy ?? true}
				overwrite={Boolean(config.overwrite)}
				placeholderChar={config.placeholderChar ?? ''}
				definitions={config.definitions}
				autoComplete={config.autoComplete ?? ''}
				inputMode={config.inputMode ?? ''}
				autoFocus={Boolean(config.autoFocus)}
				value={typeof config.defaultValue === 'string' ? config.defaultValue : ''}
			/>
		</FieldGroup>
	);
}
