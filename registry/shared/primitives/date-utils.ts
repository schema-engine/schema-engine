import { format, isValid, parseISO } from 'date-fns';

export function parseISODate(value: string | undefined): Date | undefined {
	if (!value) {
		return undefined;
	}

	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : undefined;
}

export function toISODate(date: Date | undefined): string {
	if (!date || !isValid(date)) {
		return '';
	}

	return format(date, 'yyyy-MM-dd');
}

export function formatISODate(value: string | undefined, dateFormat = 'PPP'): string {
	const parsed = parseISODate(value);
	return parsed ? format(parsed, dateFormat) : '';
}

export type DateRangeValue = {
	from?: string;
	to?: string;
};

export function parseDateRange(value: DateRangeValue | undefined) {
	return {
		from: parseISODate(value?.from),
		to: parseISODate(value?.to),
	};
}

export function toDateRangeValue(range: { from?: Date; to?: Date } | undefined): DateRangeValue {
	if (!range) {
		return {};
	}

	return {
		from: toISODate(range.from),
		to: toISODate(range.to),
	};
}

export function formatDateRange(value: DateRangeValue | undefined, dateFormat = 'PPP'): string {
	const { from, to } = value ?? {};
	if (from && to) {
		return `${formatISODate(from, dateFormat)} – ${formatISODate(to, dateFormat)}`;
	}
	if (from) {
		return formatISODate(from, dateFormat);
	}
	return '';
}
