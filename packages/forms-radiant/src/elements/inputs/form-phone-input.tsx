import { announceControlConnect } from '@ecopages/radiant-ui/form';
import './form-phone-input.css';
import { customElement, bindTo, onUpdated, prop, state } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import { MapItems } from '@ecopages/jsx/client';
import { peek, state as createState } from '@ecopages/signals';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import type { RuiSelectElement } from '@ecopages/radiant-ui/select';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from '@ecopages/radiant-ui/listbox';
import type { CountryCode } from 'libphonenumber-js';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '../../lib/field-rules.js';
import { emitControlChange, emitControlCommit } from '../../lib/field-control.js';
import { registerHostControl } from '../../lib/control-host.js';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAria, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import { FieldGroup } from '../field-group.js';
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
} from '../../lib/phone-number.js';
import type { PhoneInputFieldProps } from './form-phone-input.types.js';

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
@customElement('se-phone-input', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': '[data-ref="number"]' },
})
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
	@state protected display = '';
	@contextSelector({ context: fieldContext })
	@state
	protected field?: FieldContextValue = undefined;

	/**
	 * The country options `MapItems` renders.
	 *
	 * @remarks
	 * A signal rather than `@state`, so the option list is a keyed list in the view and `render()` does
	 * not map over it. `ready` flips after it is set, which is what re-renders the host's
	 * `disabled` state and selected flag.
	 */
	private readonly countries = createState<readonly PhoneCountryOption[]>([]);

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
		super.onConnected();
		void this.boot();
		this.registerCleanupCallback(() => {
			this.bootGeneration += 1;
			this.lib = undefined;
			this.ready = false;
		});
		announceControlConnect(this);
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
		this.country = resolvePhoneCountry(this.lib, (event.currentTarget as RuiSelectElement).value, this.country);
		this.applyNumber(this.display, true);
	};

	private readonly onNumberInput = (event: Event) => {
		this.applyNumber((event.target as HTMLInputElement).value);
	};

	private readonly onNumberCommit = (event: Event) => {
		event.stopPropagation();
		emitControlCommit(this);
	};

	private async boot() {
		const generation = ++this.bootGeneration;
		const [lib] = await Promise.all([loadLibphonenumber(), loadCountryFlags()]);
		if (generation !== this.bootGeneration || !this.isConnected) {
			return;
		}

		this.lib = lib;
		this.countries.set(listPhoneCountries(lib));
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

	private applyNumber(raw: string, commit = false) {
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
		emitControlChange(this, { commit });
	}

	private selectedCountry() {
		return peek(this.countries).find((option) => option.code === this.country);
	}

	override render(): JsxRenderable {
		const selected = this.selectedCountry();

		return (
			<div class="se-phone">
				<RuiSelect
					label="Country"
					on:change={this.onCountryChange}
					value={this.country}
					disabled={this.effectiveDisabled || !this.ready}
				>
					<RuiSelectControl>
						<RuiSelectTrigger disabled={this.effectiveDisabled || !this.ready}>
							<RuiSelectValue>
								<PhoneFlag code={selected?.code} class="se-phone__flag" />
							</RuiSelectValue>
						</RuiSelectTrigger>
						<RuiSelectToggle disabled={this.effectiveDisabled || !this.ready} />
					</RuiSelectControl>
					<RuiSelectListbox>
						<RuiAutocomplete>
							<RuiSelectSearch placeholder="Search country..." disabled={this.effectiveDisabled} />
							<RuiAutocompleteCollection>
								<RuiListbox embedded selectionMode="single" value={this.country} label="Countries">
									<MapItems each={this.countries}>
										{(option) => (
											<RuiListboxOption
												value={option.code}
												label={`${option.name} ${option.code} +${option.callingCode}`}
											>
												<PhoneFlag code={option.code} class="se-phone__option-flag" />
												<span class="se-phone__option-name">{option.name}</span>
												<span class="se-phone__option-code">+{option.callingCode}</span>
												<RuiListboxOptionIndicator />
											</RuiListboxOption>
										)}
									</MapItems>
								</RuiListbox>
								<RuiAutocompleteEmpty>No country found.</RuiAutocompleteEmpty>
							</RuiAutocompleteCollection>
						</RuiAutocomplete>
					</RuiSelectListbox>
				</RuiSelect>
				<input
					id={this.inputId || undefined}
					{...fieldAria(this.field)}
					data-ref="number"
					on:input={this.onNumberInput}
					on:change={this.onNumberCommit}
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

registerHostControl('se-phone-input', { mode: 'owns' });

export function FormPhoneInput(config: PhoneInputFieldProps) {
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
			<SePhoneInput
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
