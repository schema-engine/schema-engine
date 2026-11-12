import './form-phone-input.css';
import { customElement, bindTo, onUpdated, prop, state } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from '@ecopages/radiant-ui/listbox';
import type { CountryCode } from 'libphonenumber-js';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { emitControlChange, fieldControlHostAttributes, registerValueControl } from '@/lib/field-control';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAriaBindings, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import { FieldGroup } from '../field-group';
import {
	detectCountryFromInput,
	formatPhoneInputValue,
	hydratePhoneValue,
	listPhoneCountries,
	loadCountryFlags,
	loadLibphonenumber,
	phoneInputToE164,
	resolvePhoneCountry,
	countryFlagSvg,
	type LibPhoneNumber,
	type PhoneCountryOption,
} from '@/lib/phone-number';
import type { PhoneInputFieldProps } from './form-phone-input.types';

function PhoneFlag({ code, class: className }: { code?: string; class: string }) {
	const svg = code ? countryFlagSvg(code) : '';
	return (
		<span class={className} aria-hidden="true">
			{svg ? unsafeHtml(svg) : null}
		</span>
	);
}

/**
 * @remarks
 * `value` is the E.164 number the field submits. The visible text is `display`
 * and the country picker is `country`; a write to `value` re-derives both once
 * libphonenumber has loaded, and `committed` keeps the host's own writes from
 * being re-parsed.
 */
@customElement('se-phone-input', { hostAttributes: fieldControlHostAttributes('[data-ref="number"]') })
export class SePhoneInput extends FormAssociatedElement {
	declare readonly [JSX_PROPS]?: Partial<
		Pick<
			SePhoneInput,
			'name' | 'disabled' | 'value' | 'inputId' | 'placeholder' | 'defaultCountry' | 'international'
		>
	>;

	@prop({ type: String }) value = '';
	@prop({ type: String }) inputId = '';
	@prop({ type: String }) placeholder = '';
	@prop({ type: String }) defaultCountry = 'US';
	@prop({ type: Boolean, defaultValue: false }) international = false;

	@state @bindTo({ attr: 'data-country' }) protected country: CountryCode = 'US';
	@state @bindTo({ bool: 'data-ready' }) protected ready = false;
	@state protected countries: PhoneCountryOption[] = [];
	@state protected display = '';
	@contextSelector({ context: fieldContext })
	@bindTo(fieldAriaBindings('[data-ref="number"]'))
	@state
	protected field?: FieldContextValue = undefined;

	private committed = '';
	private lib?: LibPhoneNumber;
	private bootGeneration = 0;

	protected override formValue(): FormValue {
		return this.value;
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = typeof state === 'string' ? state : '';
	}

	protected override onConnected(): void {
		void this.boot();
		this.registerCleanupCallback(() => {
			this.bootGeneration += 1;
			this.lib = undefined;
			this.ready = false;
		});
	}

	@onUpdated(['value'])
	onValueUpdated(): void {
		if (this.lib && this.value !== this.committed) {
			this.hydrateFromValue(this.value);
		}
	}

	@onUpdated(['defaultCountry', 'international'])
	onConfigUpdated(): void {
		if (this.lib) {
			this.hydrateFromValue(this.value);
		}
	}

	private readonly onCountryChange = (event: Event) => {
		event.stopPropagation();
		if (!this.lib) {
			return;
		}
		const next = (event as CustomEvent<{ value?: string | readonly string[] }>).detail?.value;
		this.country = resolvePhoneCountry(this.lib, next, this.country);
		this.applyNumber(this.display);
	};

	private readonly onNumberInput = (event: Event) => {
		this.applyNumber((event.target as HTMLInputElement).value);
	};

	private async boot() {
		const generation = ++this.bootGeneration;
		const [lib] = await Promise.all([loadLibphonenumber(), loadCountryFlags()]);
		if (generation !== this.bootGeneration || !this.isConnected) {
			return;
		}

		this.lib = lib;
		this.countries = listPhoneCountries(lib);
		this.hydrateFromValue(this.value);
		this.ready = true;
	}

	private hydrateFromValue(value: string) {
		if (!this.lib) {
			return;
		}

		const fallback = resolvePhoneCountry(this.lib, this.defaultCountry);
		const hydrated = hydratePhoneValue(this.lib, value, fallback, this.international);
		this.country = hydrated.country;
		this.display = hydrated.display;
		this.committed = hydrated.e164;
		this.value = hydrated.e164;
	}

	private applyNumber(raw: string) {
		let next = raw;
		if (this.lib) {
			this.country = detectCountryFromInput(this.lib, raw, this.country);
			this.display = formatPhoneInputValue(this.lib, raw, this.country, this.international);
			next = phoneInputToE164(this.lib, raw, this.country);
		} else {
			this.display = raw;
		}

		this.committed = next;
		if (next === this.value) {
			return;
		}
		this.value = next;
		emitControlChange(this, next);
	}

	private selectedCountry() {
		return this.countries.find((option) => option.code === this.country);
	}

	override render(): JsxRenderable {
		const selected = this.selectedCountry();

		return (
			<div class="se-phone">
				<RuiSelect
					label="Country"
					on:rui-change={this.onCountryChange}
					value={this.country}
					disabled={this.effectiveDisabled || this.countries.length === 0}
				>
					<RuiSelectControl>
						<RuiSelectTrigger disabled={this.effectiveDisabled || this.countries.length === 0}>
							<RuiSelectValue>
								<PhoneFlag code={selected?.code} class="se-phone__flag" />
							</RuiSelectValue>
						</RuiSelectTrigger>
						<RuiSelectToggle disabled={this.effectiveDisabled || this.countries.length === 0} />
					</RuiSelectControl>
					<RuiSelectListbox>
						<RuiAutocomplete>
							<RuiSelectSearch placeholder="Search country..." disabled={this.effectiveDisabled} />
							<RuiAutocompleteCollection>
								<RuiListbox embedded selectionMode="single" value={this.country} label="Countries">
									{this.countries.map((option) => (
										<RuiListboxOption
											value={option.code}
											label={`${option.name} ${option.code} +${option.callingCode}`}
										>
											<PhoneFlag code={option.code} class="se-phone__option-flag" />
											<span class="se-phone__option-name">{option.name}</span>
											<span class="se-phone__option-code">+{option.callingCode}</span>
											<RuiListboxOptionIndicator />
										</RuiListboxOption>
									))}
								</RuiListbox>
								<RuiAutocompleteEmpty>No country found.</RuiAutocompleteEmpty>
							</RuiAutocompleteCollection>
						</RuiAutocomplete>
					</RuiSelectListbox>
				</RuiSelect>
				<input
					id={this.inputId || undefined}
					data-ref="number"
					on:input={this.onNumberInput}
					class="rui-input se-phone__number"
					type="tel"
					autocomplete="tel"
					placeholder={this.placeholder}
					disabled={this.effectiveDisabled}
					prop:value={this.display}
					spellcheck={false}
				/>
			</div>
		);
	}
}

registerValueControl('se-phone-input');

export function FormPhoneInput(config: PhoneInputFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			validation={config}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<SePhoneInput
				{...fieldControlHostAttributes('[data-ref="number"]')}
				name={config.name}
				placeholder={config.placeholder}
				disabled={config.disabled}
				inputId={config.id ?? ''}
				defaultCountry={config.defaultCountry ?? 'US'}
				international={Boolean(config.international)}
				value={typeof config.defaultValue === 'string' ? config.defaultValue : ''}
			/>
		</FieldGroup>
	);
}
