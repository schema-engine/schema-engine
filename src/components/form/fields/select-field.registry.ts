import { defaultFormRegistry } from "../../../lib/form-engine";
import { SelectField } from "../fields";

/**
 * Register select field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	name: "select",
	component: SelectField,
	category: "select",
	description: "Dropdown selection field",
	example: {
		type: "select",
		id: "example-select",
		name: "example",
		label: "Example Select",
		placeholder: "Choose an option...",
		options: [
			{ value: "option1", label: "Option 1" },
			{ value: "option2", label: "Option 2" },
		],
	},
});
