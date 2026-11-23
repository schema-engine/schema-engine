import { FormDateRange } from './form-date-range';
import { DateRangeFieldSchema, dateRangeFieldValue } from './form-date-range.types';
import { defineInput } from '@schema-engine/forms';

export const DateRangeElementRegistration = defineInput({
	$type: 'date-range',
	appearanceAxes: ['size'],
	render: FormDateRange,
	schema: DateRangeFieldSchema,
	value: dateRangeFieldValue,
	metadata: {
		name: 'Date Range Field',
		description: 'Calendar popover for selecting a start and end ISO date',
		category: 'input',
	},
});
