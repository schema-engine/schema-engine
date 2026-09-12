import { FormDateRange } from './form-date-range';
import type { DateRangeFieldConfig } from './form-date-range.types';
import { DateRangeFieldSchema } from './form-date-range.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'date-range': DateRangeFieldConfig;
		}
	}
}

export const DateRangeElementRegistration = defineInput({
	$type: 'date-range',
	render: FormDateRange,
	schema: DateRangeFieldSchema,
	metadata: {
		name: 'Date Range Field',
		description: 'Calendar popover for selecting a start and end ISO date',
		category: 'input',
	},
});
