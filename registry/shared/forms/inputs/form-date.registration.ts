import { FormDate } from './form-date';
import type { DateFieldConfig, DateFieldProps } from './form-date.types';
import { DateFieldSchema } from './form-date.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			date: DateFieldConfig;
		}
	}
}

export const DateElementRegistration: InputRegistration<'date', DateFieldConfig, DateFieldProps> = {
	$type: 'date',
	render: FormDate,
	schema: asStandardSchema(DateFieldSchema),
	metadata: {
		name: 'Date Field',
		description: 'Calendar popover for selecting a single ISO date',
		category: 'input',
	},
};
