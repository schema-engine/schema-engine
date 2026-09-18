'use client';

import { format } from 'date-fns';
import { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { useRef, useState, useSyncExternalStore, type ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateInput } from './date-input';
import { DATE_RANGE_PRESETS, getDateRangePreset, matchDateRangePreset } from './date-range-presets';
import { parseDateRange, parseISODate, toDateRangeValue, type DateRangeValue } from './date-utils';

type DraftRange = {
	from: Date;
	to: Date | undefined;
};

type DateRangePickerProps = Omit<ComponentProps<'button'>, 'onChange' | 'value'> & {
	value?: DateRangeValue;
	onChange?: (value: DateRangeValue) => void;
	placeholder?: string;
	dateFormat?: string;
	min?: string;
	max?: string;
	numberOfMonths?: number;
	presets?: boolean;
};

function formatRangeLabel(value: DateRangeValue | undefined, dateFormat: string) {
	const { from, to } = parseDateRange(value);
	if (from && to) {
		return `${format(from, dateFormat)} - ${format(to, dateFormat)}`;
	}
	if (from) {
		return format(from, dateFormat);
	}
	return '';
}

function toDraftRange(value: DateRangeValue | undefined): DraftRange | undefined {
	const { from, to } = parseDateRange(value);
	if (!from) {
		return undefined;
	}
	return { from, to };
}

/** Identity of the authored range while the popover is closed; `null` while open. */
function rangeKey(value: DateRangeValue | undefined, open: boolean): string | null {
	return open ? null : `${value?.from ?? ''}|${value?.to ?? ''}`;
}

function rangesEqual(left?: DraftRange, right?: DraftRange) {
	if (!left || !right) {
		return left === right;
	}

	return left.from.getTime() === right.from.getTime() && (left.to?.getTime() ?? 0) === (right.to?.getTime() ?? 0);
}

const COMPACT_QUERY = '(max-width: 959px)';

function subscribeCompact(onStoreChange: () => void) {
	const query = window.matchMedia(COMPACT_QUERY);
	query.addEventListener('change', onStoreChange);
	return () => query.removeEventListener('change', onStoreChange);
}

/**
 * Whether the popover should show a single month.
 *
 * @remarks
 * Read as an external store so the server render and the first client render
 * agree, instead of branching on `typeof window` in a state initializer.
 */
function useCompactLayout(): boolean {
	return useSyncExternalStore(
		subscribeCompact,
		() => window.matchMedia(COMPACT_QUERY).matches,
		() => false,
	);
}

/**
 * Range picker whose popover edits a draft before committing it.
 *
 * @remarks
 * `value` is re-adopted during render whenever the popover is closed, which
 * matches the previous effect without the extra committed render. While the
 * popover is open {@link rangeKey} returns `null`, so an in-progress draft is
 * never overwritten.
 */
function DateRangePicker({
	className,
	value,
	onChange,
	placeholder = 'Pick a date range',
	dateFormat = 'LLL dd, y',
	disabled,
	id,
	min,
	max,
	numberOfMonths = 2,
	presets = true,
	...props
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DraftRange | undefined>(() => toDraftRange(value));
	const [syncedValue, setSyncedValue] = useState(() => rangeKey(value, false));
	const openedDraftRef = useRef<DraftRange | undefined>(undefined);
	const compact = useCompactLayout();
	const minDate = parseISODate(min);
	const maxDate = parseISODate(max);
	const label = formatRangeLabel(value, dateFormat);
	const months = compact ? 1 : numberOfMonths;

	const valueKey = rangeKey(value, open);
	if (valueKey !== syncedValue) {
		setSyncedValue(valueKey);
		if (!open) {
			setDraft(toDraftRange(value));
		}
	}

	const selectedPreset =
		draft?.from && draft.to ? matchDateRangePreset({ from: draft.from, to: draft.to }) : undefined;

	const openPopover = (nextOpen: boolean) => {
		if (nextOpen) {
			const nextDraft = toDraftRange(value);
			setDraft(nextDraft);
			openedDraftRef.current = nextDraft;
		} else if (!rangesEqual(draft, openedDraftRef.current)) {
			setDraft(openedDraftRef.current);
		}
		setOpen(nextOpen);
	};

	const applyRange = () => {
		if (!draft?.from) {
			return;
		}
		onChange?.(
			toDateRangeValue({
				from: draft.from,
				to: draft.to ?? draft.from,
			}),
		);
		setOpen(false);
	};

	const setPreset = (presetName: string) => {
		const next = getDateRangePreset(presetName);
		setDraft({ from: next.from, to: next.to });
	};

	return (
		<Popover open={open} onOpenChange={openPopover}>
			<PopoverTrigger
				render={(triggerProps) => (
					<Button
						{...triggerProps}
						{...props}
						id={id}
						type="button"
						variant="outline"
						disabled={disabled}
						data-empty={!label}
						className={cn(
							'w-full justify-start gap-2 px-2.5 text-left font-normal data-[empty=true]:text-muted-foreground',
							className,
						)}
					>
						<CalendarIcon />
						<span className="truncate">{label || placeholder}</span>
						{open ? (
							<ChevronUpIcon className="ml-auto size-4 opacity-60" />
						) : (
							<ChevronDownIcon className="ml-auto size-4 opacity-60" />
						)}
					</Button>
				)}
			/>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="flex flex-col gap-3 p-3">
					<div className="flex flex-wrap items-center gap-2">
						<DateInput
							value={draft?.from}
							disabled={disabled}
							onChange={(from) => {
								setDraft((current) => {
									const to = current?.to && from > current.to ? from : (current?.to ?? from);
									return { from, to };
								});
							}}
						/>
						<span className="text-muted-foreground text-sm">–</span>
						<DateInput
							value={draft?.to ?? draft?.from}
							disabled={disabled}
							onChange={(to) => {
								setDraft((current) => {
									if (!current?.from) {
										return { from: to, to };
									}
									const from = to < current.from ? to : current.from;
									return { from, to };
								});
							}}
						/>
					</div>

					{presets && compact ? (
						<div className="flex flex-wrap gap-2">
							{DATE_RANGE_PRESETS.map((preset) => (
								<Button
									key={preset.name}
									type="button"
									size="sm"
									variant={selectedPreset === preset.name ? 'default' : 'outline'}
									onClick={() => setPreset(preset.name)}
								>
									{preset.label}
								</Button>
							))}
						</div>
					) : null}

					<div className="flex gap-3">
						<div className="flex flex-col">
							<Calendar
								mode="range"
								numberOfMonths={months}
								selected={draft}
								defaultMonth={
									draft?.from ??
									(() => {
										const month = new Date();
										month.setMonth(month.getMonth() - (months > 1 ? 1 : 0));
										return month;
									})()
								}
								disabled={(date: Date) => {
									if (minDate && date < minDate) {
										return true;
									}
									if (maxDate && date > maxDate) {
										return true;
									}
									return false;
								}}
								onSelect={(range: DateRange | undefined) => {
									if (range?.from) {
										setDraft({ from: range.from, to: range.to });
									}
								}}
							/>
						</div>

						{presets && !compact ? (
							<div className="flex w-40 flex-col gap-1 border-l border-border pl-3">
								{DATE_RANGE_PRESETS.map((preset) => (
									<Button
										key={preset.name}
										type="button"
										variant="ghost"
										className={cn(
											'justify-start px-2 font-normal',
											selectedPreset === preset.name && 'bg-accent text-accent-foreground',
										)}
										onClick={() => setPreset(preset.name)}
									>
										<span className="flex-1 text-left">{preset.label}</span>
										{selectedPreset === preset.name ? <CheckIcon className="size-4" /> : null}
									</Button>
								))}
							</div>
						) : null}
					</div>

					<div className="flex justify-end gap-2 border-t border-border pt-3">
						<Button type="button" variant="ghost" onClick={() => openPopover(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={!draft?.from} onClick={applyRange}>
							Apply
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export { DateRangePicker };
export type { DateRangeValue };
