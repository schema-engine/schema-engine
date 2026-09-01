import { FormDateRange } from './form-date-range';
import type { DateRangeFieldConfig, DateRangeFieldProps } from './form-date-range.types';
import { DateRangeFieldSchema } from './form-date-range.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'date-range': DateRangeFieldConfig;
		}
	}
}

export const DateRangeElementRegistration: InputRegistration<
	'date-range',
	DateRangeFieldConfig,
	DateRangeFieldProps
> = {
	$type: 'date-range',
	render: FormDateRange,
	schema: asStandardSchema(DateRangeFieldSchema),
	metadata: {
		name: 'Date Range Field',
		description: 'Calendar popover for selecting a start and end ISO date',
		category: 'input',
	},
};
