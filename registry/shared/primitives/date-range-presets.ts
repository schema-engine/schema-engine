export type DateRangePreset = {
	name: string;
	label: string;
};

export type DateRangeDates = {
	from: Date;
	to: Date;
};

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
	{ name: 'today', label: 'Today' },
	{ name: 'yesterday', label: 'Yesterday' },
	{ name: 'last7', label: 'Last 7 days' },
	{ name: 'last14', label: 'Last 14 days' },
	{ name: 'last30', label: 'Last 30 days' },
	{ name: 'thisWeek', label: 'This week' },
	{ name: 'lastWeek', label: 'Last week' },
	{ name: 'thisMonth', label: 'This month' },
	{ name: 'lastMonth', label: 'Last month' },
];

function startOfDay(date: Date) {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

function endOfDay(date: Date) {
	const next = new Date(date);
	next.setHours(23, 59, 59, 999);
	return next;
}

export function getDateRangePreset(presetName: string): DateRangeDates {
	const preset = DATE_RANGE_PRESETS.find(({ name }) => name === presetName);
	if (!preset) {
		throw new Error(`Unknown date range preset: ${presetName}`);
	}

	const from = new Date();
	const to = new Date();
	const firstDayOfWeek = from.getDate() - from.getDay();

	switch (preset.name) {
		case 'today':
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'yesterday':
			from.setDate(from.getDate() - 1);
			to.setDate(to.getDate() - 1);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'last7':
			from.setDate(from.getDate() - 6);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'last14':
			from.setDate(from.getDate() - 13);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'last30':
			from.setDate(from.getDate() - 29);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'thisWeek':
			from.setDate(firstDayOfWeek);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'lastWeek':
			from.setDate(from.getDate() - 7 - from.getDay());
			to.setDate(to.getDate() - to.getDay() - 1);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'thisMonth':
			from.setDate(1);
			return { from: startOfDay(from), to: endOfDay(to) };
		case 'lastMonth':
			from.setMonth(from.getMonth() - 1);
			from.setDate(1);
			to.setDate(0);
			return { from: startOfDay(from), to: endOfDay(to) };
		default:
			return { from: startOfDay(from), to: endOfDay(to) };
	}
}

export function matchDateRangePreset(range: DateRangeDates): string | undefined {
	const normalizedFrom = startOfDay(range.from).getTime();
	const normalizedTo = startOfDay(range.to).getTime();

	for (const preset of DATE_RANGE_PRESETS) {
		const presetRange = getDateRangePreset(preset.name);
		if (
			startOfDay(presetRange.from).getTime() === normalizedFrom &&
			startOfDay(presetRange.to).getTime() === normalizedTo
		) {
			return preset.name;
		}
	}

	return undefined;
}
