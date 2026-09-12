import { FormDate } from './form-date';
import type { DateFieldConfig } from './form-date.types';
import { DateFieldSchema } from './form-date.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			date: DateFieldConfig;
		}
	}
}

export const DateElementRegistration = defineInput({
	$type: 'date',
	render: FormDate,
	schema: DateFieldSchema,
	metadata: {
		name: 'Date Field',
		description: 'Calendar popover for selecting a single ISO date',
		category: 'input',
	},
});
