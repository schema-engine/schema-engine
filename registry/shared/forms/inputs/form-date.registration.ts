import { FormDate } from './form-date';
import { DateFieldSchema, dateFieldValue } from './form-date.types';
import { defineInput } from '@schema-engine/forms';

export const DateElementRegistration = defineInput({
	$type: 'date',
	appearanceAxes: ['size'],
	render: FormDate,
	schema: DateFieldSchema,
	value: dateFieldValue,
	metadata: {
		name: 'Date Field',
		description: 'Calendar popover for selecting a single ISO date',
		category: 'input',
	},
});
