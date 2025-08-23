import { defaultFormRegistry } from "../../../lib/form-engine";
import { NumberField } from "../fields";

/**
 * Register number field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	name: "number",
	component: NumberField,
	category: "input",
	description: "Numeric input field",
	example: {
		type: "number",
		id: "example-number",
		name: "example",
		label: "Example Number",
		placeholder: "Enter a number...",
		min: 0,
		max: 100,
	},
});
