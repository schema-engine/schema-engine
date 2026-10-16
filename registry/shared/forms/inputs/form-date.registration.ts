import { FormDate } from './form-date';
import { DateFieldSchema } from './form-date.types';
import { defineInput } from '@schema-engine/forms';

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
