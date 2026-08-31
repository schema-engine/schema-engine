import { CheckIcon, ChevronsUpDown } from 'lucide-react';
import * as BasePhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ListBox, ListBoxItem } from 'react-aria-components';

import { cn } from '@/lib/utils';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ComponentProps,
	type KeyboardEvent,
} from 'react';
import { detectCountryFromInput } from '@/components/ui/schema-engine/components/phone-country';

type PhoneInputProps = Omit<ComponentProps<'input'>, 'onChange' | 'value' | 'ref'> &
	Omit<BasePhoneInput.Props<typeof BasePhoneInput.default>, 'onChange'> & {
		onChange?: (value: BasePhoneInput.Value) => void;
	};

type PhoneInputApi = {
	country: BasePhoneInput.Country | undefined;
	selectCountry: (country: BasePhoneInput.Country) => void;
	registerCountrySelector: (selector: (country: BasePhoneInput.Country) => void) => void;
};

const PhoneInputApiContext = createContext<PhoneInputApi | null>(null);

function PhoneInput({ className, onChange, onCountryChange, value, defaultCountry, ...props }: PhoneInputProps) {
	const [country, setCountry] = useState<BasePhoneInput.Country | undefined>(defaultCountry);
	const [selectCountry, setCountrySelector] = useState<(country: BasePhoneInput.Country) => void>(() => () => {});
	const registerCountrySelector = useCallback(
		(selector: (country: BasePhoneInput.Country) => void) => setCountrySelector(() => selector),
		[],
	);
	const api = useMemo(
		() => ({ country, selectCountry, registerCountrySelector }),
		[country, selectCountry, registerCountrySelector],
	);

	return (
		<PhoneInputApiContext.Provider value={api}>
			<BasePhoneInput.default
				{...props}
				className={cn(
					'flex',
					props['aria-invalid'] &&
						'[&_*[data-slot=popover-trigger]]:border-destructive [&_*[data-slot=popover-trigger]]:ring-destructive/50',
					className,
				)}
				flagComponent={FlagComponent}
				countrySelectComponent={CountrySelect}
				inputComponent={PhoneNumberInput}
				smartCaret={false}
				addInternationalOption={false}
				focusInputOnCountrySelection={false}
				defaultCountry={defaultCountry}
				value={value || undefined}
				onCountryChange={(nextCountry) => {
					setCountry(nextCountry);
					onCountryChange?.(nextCountry);
				}}
				onChange={(next) => onChange?.(next || ('' as BasePhoneInput.Value))}
			/>
		</PhoneInputApiContext.Provider>
	);
}

function PhoneNumberInput({ className, onChange, ...props }: ComponentProps<typeof Input>) {
	const api = useContext(PhoneInputApiContext);

	return (
		<Input
			{...props}
			className={cn('rounded-s-none', className)}
			onChange={(event) => {
				onChange?.(event);
				const fallback = api?.country ?? 'US';
				const detected = detectCountryFromInput(event.currentTarget.value, fallback);
				if (detected !== fallback) {
					queueMicrotask(() => api?.selectCountry(detected));
				}
			}}
		/>
	);
}

type CountryEntry = { label: string; value: BasePhoneInput.Country | undefined };

type CountrySelectProps = {
	disabled?: boolean;
	value: BasePhoneInput.Country;
	options: CountryEntry[];
	onChange: (country: BasePhoneInput.Country) => void;
};

function CountrySelect({ disabled, value: selectedCountry, options: countryList, onChange }: CountrySelectProps) {
	const api = useContext(PhoneInputApiContext);
	const [searchValue, setSearchValue] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const registerCountrySelector = api?.registerCountrySelector;
	const filtered = countryList.filter(
		({ label, value }) =>
			value &&
			(label.toLowerCase().includes(searchValue.toLowerCase()) ||
				value.toLowerCase().includes(searchValue.toLowerCase())),
	);

	useEffect(() => registerCountrySelector?.(onChange), [onChange, registerCountrySelector]);

	const selectAt = (index: number) => {
		const option = filtered[index];
		if (option?.value) {
			onChange(option.value);
			setIsOpen(false);
		}
	};

	const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex((index) => Math.max(index - 1, 0));
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			selectAt(activeIndex);
		}
	};

	return (
		<Popover
			open={isOpen}
			modal
			onOpenChange={(open) => {
				setIsOpen(open);
				if (open) {
					setSearchValue('');
					setActiveIndex(0);
				}
			}}
		>
			<PopoverTrigger
				render={(props) => (
					<Button
						{...props}
						type="button"
						variant="outline"
						className="flex gap-1 rounded-s-md rounded-e-none border-r-0 px-3 focus:z-10"
						disabled={disabled}
						data-country={selectedCountry || undefined}
					>
						<FlagComponent country={selectedCountry} countryName={selectedCountry} />
						<ChevronsUpDown className={cn('-mr-1', disabled && 'hidden')} />
					</Button>
				)}
			/>
			<PopoverContent className="w-[300px] p-2">
				<Input
					autoFocus
					value={searchValue}
					onChange={(event) => {
						setSearchValue(event.target.value);
						setActiveIndex(0);
					}}
					onKeyDown={onSearchKeyDown}
					placeholder="Search country..."
					className="mb-2"
				/>
				<ListBox
					aria-label="Countries"
					selectionMode="single"
					selectedKeys={selectedCountry ? [selectedCountry] : []}
					onSelectionChange={(keys) => {
						const key = Array.from(keys)[0];
						if (key) {
							onChange(key as BasePhoneInput.Country);
							setIsOpen(false);
						}
					}}
					className="max-h-72 overflow-y-auto"
				>
					{filtered.map(({ value, label }, index) =>
						value ? (
							<ListBoxItem
								key={value}
								id={value}
								textValue={label}
								className={cn(
									'relative flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[focused]:bg-transparent',
									index === activeIndex && 'shadow-[inset_0_0_0_2px_currentColor]',
								)}
							>
								<FlagComponent country={value} countryName={label} />
								<span className="flex-1 text-sm">{label}</span>
								<span className="text-foreground/50 text-sm">{`+${BasePhoneInput.getCountryCallingCode(value)}`}</span>
								<CheckIcon
									className={`ml-auto size-4 shrink-0 ${value === selectedCountry ? 'opacity-100' : 'opacity-0'}`}
								/>
							</ListBoxItem>
						) : null,
					)}
				</ListBox>
			</PopoverContent>
		</Popover>
	);
}

function FlagComponent({ country, countryName }: BasePhoneInput.FlagProps) {
	const Flag = flags[country];

	return (
		<span className="flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full">
			{Flag && <Flag title={countryName} />}
		</span>
	);
}

export { PhoneInput };
