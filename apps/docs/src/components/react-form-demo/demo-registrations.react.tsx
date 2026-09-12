/** @jsxImportSource react */
import * as z from 'zod/mini';
import { defineInput, defineStatic } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { DemoCheckbox, DemoInput, DemoSelect, DemoSubmit, DemoTextarea } from './demo-kit.react';

export const DemoInputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	inputType: z._default(z.enum(['text', 'email', 'password', 'url', 'tel', 'search', 'date']), 'text'),
	autoComplete: z.optional(z.string()),
});

export type DemoInputConfig = z.input<typeof DemoInputSchema>;

export const DemoInputRegistration = defineInput({
	$type: 'input',
	render: DemoInput,
	schema: DemoInputSchema,
	metadata: {
		name: 'Demo Input',
		description: 'Radiant-styled text input for docs demos',
		category: 'input',
	},
});

const DemoTextareaSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('textarea'),
	rows: z.optional(z.number()),
});

export type DemoTextareaConfig = z.infer<typeof DemoTextareaSchema>;

export const DemoTextareaRegistration = defineInput({
	$type: 'textarea',
	render: DemoTextarea,
	schema: DemoTextareaSchema,
	metadata: {
		name: 'Demo Textarea',
		description: 'Radiant-styled multi-line input for docs demos',
		category: 'input',
	},
});

const DemoSelectSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('select'),
	options: z.array(z.object({ value: z.any(), label: z.string(), disabled: z.optional(z.boolean()) })),
	multiple: z.optional(z.boolean()),
});

export type DemoSelectConfig = z.infer<typeof DemoSelectSchema>;

export const DemoSelectRegistration = defineInput({
	$type: 'select',
	render: DemoSelect,
	schema: DemoSelectSchema,
	metadata: {
		name: 'Demo Select',
		description: 'Radiant-styled single-select for docs demos',
		category: 'input',
	},
});

const DemoCheckboxSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('checkbox'),
	checkLabel: z.optional(z.string()),
});

export type DemoCheckboxConfig = z.infer<typeof DemoCheckboxSchema>;

export const DemoCheckboxRegistration = defineInput({
	$type: 'checkbox',
	render: DemoCheckbox,
	schema: DemoCheckboxSchema,
	metadata: {
		name: 'Demo Checkbox',
		description: 'Radiant-styled checkbox for docs demos',
		category: 'input',
	},
});

const DemoSubmitSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('submit'),
	label: z._default(z.string(), 'Submit'),
});

export type DemoSubmitConfig = z.infer<typeof DemoSubmitSchema>;

export const DemoSubmitRegistration = defineStatic({
	$type: 'submit',
	render: DemoSubmit,
	schema: DemoSubmitSchema,
	metadata: {
		name: 'Demo Submit',
		description: 'Radiant-styled submit action for docs demos',
		category: 'action',
	},
});

export const demoFormRegistrations = [
	DemoInputRegistration,
	DemoTextareaRegistration,
	DemoSelectRegistration,
	DemoCheckboxRegistration,
	DemoSubmitRegistration,
] as const;
