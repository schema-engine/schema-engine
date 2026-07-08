import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { FormComposer } from '@/builder/form-composer';
import type { InputRegistration, LayoutRegistration, StepperRegistration, BuilderActionRegistration } from '@/types';
import { FormEngine } from '@/engine/form-engine';
import { ComponentType } from '@/engine/component-type';
import {
	createActionConfigValidatorMap,
	createFormEngineSchemaArtifacts,
	type FormEngineSchemaMetadata,
} from '@/engine/schema-artifacts';

function createActionSchema<TType extends string>(type: TType, shape: z.ZodRawShape = {}) {
	return z.object({
		id: z.string(),
		$type: z.literal(type),
		...shape,
	});
}

function expectSchemaKeys(schemas: Record<string, unknown>, keys: string[]) {
	expect(Object.keys(schemas).sort()).toEqual([...keys].sort());
}

function expectTypeConst(schemas: Record<string, { properties?: { $type?: { const?: string } } }>, key: string, type: string) {
	expect(schemas[key]?.properties?.$type?.const).toBe(type);
}

describe('FormEngine JSON Schema Generation', () => {
	describe('Basic Schema Generation', () => {
		test('should generate JSON schema from empty engine', () => {
			const engine = new FormComposer().build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema).toHaveProperty('schemas');
			expect(Object.keys(schema.schemas)).toEqual([]);
		});

		test('should generate schema with single element', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
				placeholder: z.string().optional(),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'A text input field',
					category: 'input',
				},
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, ['element:text']);
			expectTypeConst(schema.schemas, 'element:text', 'text');
		});

		test('should generate schemas for multiple component types', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const cardLayoutSchema = z.object({
				$type: z.literal('card'),
				padding: z.enum(['sm', 'md', 'lg']).optional(),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					category: 'input',
				},
				render: () => null,
			};

			const cardLayoutRegistration: LayoutRegistration = {
				$type: 'card',
				schema: cardLayoutSchema,
				metadata: {
					name: 'Card Layout',
				},
				render: () => null,
			};

			const engine = new FormComposer()
				.addElement(textInputRegistration)
				.addLayout(cardLayoutRegistration)
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, ['element:text', 'layout:card']);
		});
	});

	describe('Schema Metadata', () => {
		test('should expose schema metadata via catalog', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const engine = new FormComposer()
				.addElement({
					$type: 'text',
					schema: textInputSchema,
					metadata: {
						name: 'Text Input',
						description: 'A text input field',
						category: 'input',
					},
					render: () => null,
				})
				.build();

			const catalog = engine.getSchemaCatalog();

			expect(catalog?.get('element:text')).toEqual({
				id: 'element:text',
				componentType: ComponentType.Element,
				title: 'Text Input',
				description: 'A text input field',
				category: 'input',
			});
			expect(catalog?.getBySchema(textInputSchema)).toEqual(catalog?.get('element:text'));
		});

		test('should include metadata in generated schema', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'A text input field for collecting user data',
					category: 'input',
					tags: ['input', 'text', 'form'],
				},
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const schemaRegistry = engine.getSchemaRegistry();
			const registeredMetadata = schemaRegistry.get(textInputSchema);

			expect(registeredMetadata?.id).toBe(`${ComponentType.Element}:text`);
			expect(registeredMetadata?.componentType).toBe(ComponentType.Element);
			expect(registeredMetadata?.title).toBe('Text Input');
			expect(registeredMetadata?.description).toBe('A text input field for collecting user data');
			expect(registeredMetadata?.category).toBe('input');
		});

		test('should use namespaced IDs for different component types', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textLayoutSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					category: 'input',
				},
				render: () => null,
			};

			const textLayoutRegistration: LayoutRegistration = {
				$type: 'text',
				schema: textLayoutSchema,
				metadata: {
					name: 'Text Layout',
				},
				render: () => null,
			};

			const engine = new FormComposer()
				.addElement(textInputRegistration)
				.addLayout(textLayoutRegistration)
				.build();

			const schemaRegistry = engine.getSchemaRegistry();
			const elementMetadata = schemaRegistry.get(textInputSchema);
			const layoutMetadata = schemaRegistry.get(textLayoutSchema);

			expect(elementMetadata?.id).toBe('element:text');
			expect(layoutMetadata?.id).toBe('layout:text');
		});
	});

	describe('All Component Types', () => {
		test('should generate schemas for elements, layouts, steppers, and actions', () => {
			const elementSchema = z.object({ $type: z.literal('text') });
			const layoutSchema = z.object({ $type: z.literal('card') });
			const stepperSchema = z.object({ $type: z.literal('wizard') });
			const actionSchema = createActionSchema('submit', { endpoint: z.string().url() });

			const elementReg: InputRegistration = {
				$type: 'text',
				schema: elementSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const layoutReg: LayoutRegistration = {
				$type: 'card',
				schema: layoutSchema,
				metadata: { name: 'Card Layout' },
				render: () => null,
			};

			const stepperReg: StepperRegistration = {
				$type: 'wizard',
				schema: stepperSchema,
				metadata: { name: 'Wizard Stepper' },
				render: () => null,
			};

			const actionReg: BuilderActionRegistration = {
				$type: 'submit',
				schema: actionSchema,
				metadata: { name: 'Submit Action' },
				execute: async () => ({ success: true }),
			};

			const engine = new FormComposer()
				.addElement(elementReg)
				.addLayout(layoutReg)
				.addStepper(stepperReg)
				.addAction(actionReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, [
				'element:text',
				'layout:card',
				'stepper:wizard',
				'action:submit',
			]);
		});
	});

	describe('Schema Collection Options', () => {
		test('should support custom URI generation', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection({
				uri: (id: string) => `https://api.example.com/schemas/${id}.json`,
			});

			expectSchemaKeys(schema.schemas, ['element:text']);
			expect(schema.schemas['element:text']?.$id).toBe('https://api.example.com/schemas/element:text.json');
		});

		test('should use default options when none provided', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, ['element:text']);
		});
	});

	describe('Schema Registry Access', () => {
		test('should provide access to schema registry', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const registry = engine.getSchemaRegistry();

			expect(registry.has(textInputSchema)).toBe(true);
		});

		test('should allow querying registered schemas', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const emailInputSchema = z.object({
				$type: z.literal('email'),
			});

			const textInputReg: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailInputReg: InputRegistration = {
				$type: 'email',
				schema: emailInputSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputReg).addElement(emailInputReg).build();

			const registry = engine.getSchemaRegistry();
			const textMetadata = registry.get(textInputSchema);
			const emailMetadata = registry.get(emailInputSchema);

			expect(textMetadata?.id).toBe('element:text');
			expect(emailMetadata?.id).toBe('element:email');
		});
	});

	describe('Complex Schemas', () => {
		test('should handle complex nested schemas', () => {
			const complexSchema = z.object({
				$type: z.literal('complex'),
				label: z.string(),
				options: z.array(
					z.object({
						value: z.string(),
						label: z.string(),
					}),
				),
				validation: z
					.object({
						required: z.boolean().optional(),
						minLength: z.number().optional(),
						maxLength: z.number().optional(),
					})
					.optional(),
			});

			const complexRegistration: InputRegistration = {
				$type: 'complex',
				schema: complexSchema,
				metadata: { name: 'Complex Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(complexRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expectTypeConst(schema.schemas, 'element:complex', 'complex');
		});

		test('should handle schemas with enums and unions', () => {
			const enumSchema = z.object({
				$type: z.literal('select'),
				size: z.enum(['sm', 'md', 'lg']).optional(),
				variant: z.union([z.literal('primary'), z.literal('secondary'), z.literal('tertiary')]).optional(),
			});

			const enumRegistration: InputRegistration = {
				$type: 'select',
				schema: enumSchema,
				metadata: { name: 'Select Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(enumRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expectTypeConst(schema.schemas, 'element:select', 'select');
		});
	});

	describe('Multiple Elements', () => {
		test('should handle multiple elements of the same category', () => {
			const textSchema = z.object({ $type: z.literal('text') });
			const emailSchema = z.object({ $type: z.literal('email') });
			const passwordSchema = z.object({ $type: z.literal('password') });

			const textReg: InputRegistration = {
				$type: 'text',
				schema: textSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailReg: InputRegistration = {
				$type: 'email',
				schema: emailSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const passwordReg: InputRegistration = {
				$type: 'password',
				schema: passwordSchema,
				metadata: { name: 'Password Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textReg).addElement(emailReg).addElement(passwordReg).build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, ['element:text', 'element:email', 'element:password']);
		});

		test('should inspect actual schema structure', () => {
			const textSchema = z.object({ $type: z.literal('text') });
			const emailSchema = z.object({ $type: z.literal('email') });

			const textReg: InputRegistration = {
				$type: 'text',
				schema: textSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailReg: InputRegistration = {
				$type: 'email',
				schema: emailSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textReg).addElement(emailReg).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema).toHaveProperty('schemas');
			expect(typeof schema.schemas).toBe('object');
		});

		test('should handle elements from different categories', () => {
			const inputSchema = z.object({ $type: z.literal('text') });
			const headingSchema = z.object({ $type: z.literal('heading') });
			const dividerSchema = z.object({ $type: z.literal('divider') });
			const buttonSchema = z.object({ $type: z.literal('button') });

			const inputReg: InputRegistration = {
				$type: 'text',
				schema: inputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const headingReg: InputRegistration = {
				$type: 'heading',
				schema: headingSchema,
				metadata: { name: 'Heading', category: 'content' },
				render: () => null,
			};

			const dividerReg: InputRegistration = {
				$type: 'divider',
				schema: dividerSchema,
				metadata: { name: 'Divider', category: 'decoration' },
				render: () => null,
			};

			const buttonReg: InputRegistration = {
				$type: 'button',
				schema: buttonSchema,
				metadata: { name: 'Button', category: 'interactive' },
				render: () => null,
			};

			const engine = new FormComposer()
				.addElement(inputReg)
				.addElement(headingReg)
				.addElement(dividerReg)
				.addElement(buttonReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();
			const registry = engine.getSchemaRegistry();

			expectSchemaKeys(schema.schemas, [
				'element:text',
				'element:heading',
				'element:divider',
				'element:button',
			]);

			expect(registry.get(inputSchema)?.category).toBe('input');
			expect(registry.get(headingSchema)?.category).toBe('content');
			expect(registry.get(dividerSchema)?.category).toBe('decoration');
			expect(registry.get(buttonSchema)?.category).toBe('interactive');
		});
	});

	describe('Schema Structure and $ref Usage', () => {
		test('should inspect schema output format', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
				placeholder: z.string().optional(),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'A text input field',
					category: 'input',
				},
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, ['element:text']);
		});

		test('should check if schemas are properly interlinked', () => {
			const addressSchema = z.object({
				$type: z.literal('address'),
				street: z.string(),
				city: z.string(),
			});

			const personSchema = z.object({
				$type: z.literal('person'),
				name: z.string(),
				address: addressSchema,
			});

			const addressReg: InputRegistration = {
				$type: 'address',
				schema: addressSchema,
				metadata: { name: 'Address', category: 'input' },
				render: () => null,
			};

			const personReg: InputRegistration = {
				$type: 'person',
				schema: personSchema,
				metadata: { name: 'Person', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(addressReg).addElement(personReg).build();

			const schema = engine.generateJSONSchemaCollection();

			expectSchemaKeys(schema.schemas, ['element:address', 'element:person']);
		});

		test('should verify URI generation for $ref', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					category: 'input',
				},
				render: () => null,
			};

			const engine = new FormComposer().addElement(textInputRegistration).build();

			const schemaWithDefaultURI = engine.generateJSONSchemaCollection();

			const schemaWithCustomURI = engine.generateJSONSchemaCollection({
				uri: (id) => `https://api.example.com/schemas/${id}.json`,
			});

			expect(schemaWithDefaultURI.schemas['element:text']?.$id).toBe('#/definitions/element:text');
			expect(schemaWithCustomURI.schemas['element:text']?.$id).toBe(
				'https://api.example.com/schemas/element:text.json',
			);
		});

		test('should generate proper JSON Schema format with all component types', () => {
			const elementSchema = z.object({ $type: z.literal('text'), label: z.string().optional() });
			const layoutSchema = z.object({ $type: z.literal('card'), padding: z.enum(['sm', 'md', 'lg']).optional() });
			const stepperSchema = z.object({ $type: z.literal('wizard'), showProgress: z.boolean().optional() });
			const actionSchema = createActionSchema('submit', {
				endpoint: z.string().url(),
				method: z.enum(['GET', 'POST']).optional(),
			});

			const elementReg: InputRegistration = {
				$type: 'text',
				schema: elementSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const layoutReg: LayoutRegistration = {
				$type: 'card',
				schema: layoutSchema,
				metadata: { name: 'Card Layout' },
				render: () => null,
			};

			const stepperReg: StepperRegistration = {
				$type: 'wizard',
				schema: stepperSchema,
				metadata: { name: 'Wizard Stepper' },
				render: () => null,
			};

			const actionReg: BuilderActionRegistration = {
				$type: 'submit',
				schema: actionSchema,
				metadata: { name: 'Submit Action' },
				execute: async () => ({ success: true }),
			};

			const engine = new FormComposer()
				.addElement(elementReg)
				.addLayout(layoutReg)
				.addStepper(stepperReg)
				.addAction(actionReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema).toHaveProperty('schemas');
			expect(Object.keys(schema.schemas)).toContain('element:text');
			expect(Object.keys(schema.schemas)).toContain('layout:card');
			expect(Object.keys(schema.schemas)).toContain('stepper:wizard');
			expect(Object.keys(schema.schemas)).toContain('action:submit');
		});
	});

	describe('Form Config Schema', () => {
		test('should generate schema for form configuration object', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string(),
				required: z.boolean().optional(),
			});

			const textReg: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textReg).build();

			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.$id).toBe('form-config-schema');
			expect(configSchema.type).toBe('object');
			expect(configSchema.properties).toHaveProperty('id');
			expect(configSchema.properties).toHaveProperty('steps');
			expect(configSchema.required).toContain('id');
			expect(configSchema.required).toContain('steps');

			expect(configSchema.$defs).toHaveProperty('element:text');
			expectTypeConst(configSchema.$defs as Record<string, { properties?: { $type?: { const?: string } } }>, 'element:text', 'text');

			const elementsItems = configSchema.properties.steps.items.properties.elements.items;
			const hasDirectRef = elementsItems.$ref === '#/$defs/element:text';
			const hasAnyOf = elementsItems.anyOf?.[0]?.$ref === '#/$defs/element:text';
			expect(hasDirectRef || hasAnyOf).toBe(true);
		});

		test('should expose schema artifacts through the engine API', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string(),
			});

			const engine = new FormComposer()
				.addElement({
					$type: 'text',
					schema: textInputSchema,
					metadata: { name: 'Text Input', category: 'input' },
					render: () => null,
				})
				.build();

			const artifacts = engine.getSchemaArtifacts();

			expect(artifacts.metadataCatalog).toBe(engine.getSchemaCatalog());
			expect(artifacts.metadataRegistry).toBe(engine.getSchemaRegistry());
			expect(artifacts.formConfigValidator).toBe(engine.getFormConfigSchema());
			expect(artifacts.jsonSchema.formConfigStandardSchema).toBe(engine.getFormConfigStandardSchema());
		});

		test('should expose form config as Standard JSON Schema', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string(),
			});

			const engine = new FormComposer()
				.addElement({
					$type: 'text',
					schema: textInputSchema,
					metadata: { name: 'Text Input', category: 'input' },
					render: () => null,
				})
				.build();

			const standardSchema = engine.getFormConfigStandardSchema();
			const schema = standardSchema['~standard'].jsonSchema.input({
				target: 'draft-2020-12',
			});

			expect(standardSchema['~standard'].version).toBe(1);
			expect(standardSchema['~standard'].vendor).toBe('@schema-engine/forms');
			expect(schema).toHaveProperty('$id', 'form-config-schema');
			expect(schema).toHaveProperty('properties.steps');
		});

		test('should expose registered action configs as Standard JSON Schema', () => {
			const actionSchema = createActionSchema('submit', {
				endpoint: z.url(),
				method: z.enum(['GET', 'POST']).optional(),
			});

			const engine = new FormComposer()
				.addAction({
					$type: 'submit',
					schema: actionSchema,
					metadata: { name: 'Submit Action' },
					execute: async () => ({ success: true }),
				})
				.build();

			const standardSchema = engine.getActionConfigStandardSchema('submit');
			const schema = standardSchema?.['~standard'].jsonSchema.input({
				target: 'draft-2020-12',
			});

			expect(standardSchema?.['~standard'].version).toBe(1);
			expect(standardSchema?.['~standard'].vendor).toBe('@schema-engine/forms');
			expect(schema).toHaveProperty('$id', 'action:submit');
			expect(schema).toHaveProperty('properties.$type.const', 'submit');
			expect(engine.generateActionConfigSchema('submit')).toHaveProperty('$id', 'action:submit');
		});

		test('should preserve action schema support when resolving legacy engine registries', () => {
			const actionSchema = createActionSchema('submit', {
				endpoint: z.string().url(),
			});

			const schemaRegistry = z.registry<FormEngineSchemaMetadata>();
			schemaRegistry.add(actionSchema, {
				id: 'action:submit',
				componentType: ComponentType.Action,
				title: 'Submit Action',
			});

			const engine = new FormEngine({
				elements: new Map(),
				layouts: new Map(),
				steppers: new Map(),
				actions: new Map([
					[
						'submit',
						{
							$type: 'submit',
							schema: actionSchema,
							metadata: { name: 'Submit Action' },
							execute: async () => ({ success: true }),
						} satisfies BuilderActionRegistration,
					],
				]),
				schemaRegistry,
				formConfigSchema: z.object({
					id: z.string(),
					steps: z.array(z.object({ id: z.string(), title: z.string(), elements: z.array(z.any()) })),
				}),
			});

			expect(engine.getActionConfigStandardSchema('submit')?.['~standard'].vendor).toBe(
				'@schema-engine/forms',
			);
			expect(engine.generateActionConfigSchema('submit')).toHaveProperty('$id', 'action:submit');
		});

		test('should allow custom schema artifact naming conventions', () => {
			const actionSchema = createActionSchema('submit', {
				endpoint: z.string().url(),
			});
			const formConfigSchema = z.object({
				id: z.string(),
				steps: z.array(z.object({ id: z.string(), title: z.string(), elements: z.array(z.any()) })),
			});
			const schemaRegistry = z.registry<FormEngineSchemaMetadata>();
			schemaRegistry.add(actionSchema, {
				id: 'action:submit',
				componentType: ComponentType.Action,
				title: 'Submit Action',
			});

			const schemaArtifacts = createFormEngineSchemaArtifacts(
				schemaRegistry,
				formConfigSchema,
				{
					vendor: 'internal-test-vendor',
					formConfigSchemaId: 'custom-form-config',
					actionSchemaId: (actionType) => `custom-action:${actionType}`,
				},
				createActionConfigValidatorMap([
					{
						$type: 'submit',
						schema: actionSchema,
						metadata: { name: 'Submit Action' },
						execute: async () => ({ success: true }),
					} satisfies BuilderActionRegistration,
				]),
			);

			const formSchema = schemaArtifacts.jsonSchema.formConfigStandardSchema['~standard'].jsonSchema.input({
				target: 'draft-2020-12',
			});
			const actionStandardSchema = schemaArtifacts.jsonSchema.actionConfigStandardSchemas.submit;
			const actionConfigSchema = actionStandardSchema['~standard'].jsonSchema.input({
				target: 'draft-2020-12',
			});

			expect(schemaArtifacts.jsonSchema.formConfigStandardSchema['~standard'].vendor).toBe(
				'internal-test-vendor',
			);
			expect(formSchema).toHaveProperty('$id', 'custom-form-config');
			expect(actionStandardSchema['~standard'].vendor).toBe('internal-test-vendor');
			expect(actionConfigSchema).toHaveProperty('$id', 'custom-action:submit');
		});

		test('should validate actual form config structure', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string(),
			});

			const cardLayoutSchema = z.object({
				$type: z.literal('card'),
				padding: z.number().optional(),
			});

			const textReg: InputRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const cardReg: LayoutRegistration = {
				$type: 'card',
				schema: cardLayoutSchema,
				metadata: { name: 'Card Layout' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textReg).addLayout(cardReg).build();

			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.properties).toHaveProperty('id');
			expect(configSchema.properties).toHaveProperty('title');
			expect(configSchema.properties).toHaveProperty('steps');
			expect(configSchema.properties.steps.type).toBe('array');
			expect(configSchema.properties.steps.items.properties).toHaveProperty('layout');
			expect(configSchema.properties.steps.items.properties).toHaveProperty('elements');
		});

		test('should not expose legacy top-level form fields in config schema', () => {
			const textReg: InputRegistration = {
				$type: 'text',
				schema: z.object({ $type: z.literal('text') }),
				metadata: { name: 'Text', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(textReg).build();
			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.properties).not.toHaveProperty('metadata');
			expect(configSchema.properties).not.toHaveProperty('elements');
			expect(configSchema.properties).not.toHaveProperty('layout');
		});

		test('should work with multiple elements and all component types', () => {
			const textSchema = z.object({ $type: z.literal('text'), label: z.string() });
			const numberSchema = z.object({ $type: z.literal('number'), min: z.number() });
			const layoutSchema = z.object({ $type: z.literal('card') });
			const stepperSchema = z.object({ $type: z.literal('wizard') });
			const actionSchema = createActionSchema('submit');

			const engine = new FormComposer()
				.addElement({
					$type: 'text',
					schema: textSchema,
					metadata: { name: 'Text', category: 'input' },
					render: () => null,
				})
				.addElement({
					$type: 'number',
					schema: numberSchema,
					metadata: { name: 'Number', category: 'input' },
					render: () => null,
				})
				.addLayout({
					$type: 'card',
					schema: layoutSchema,
					metadata: { name: 'Card' },
					render: () => null,
				})
				.addStepper({
					$type: 'wizard',
					schema: stepperSchema,
					metadata: { name: 'Wizard' },
					render: () => null,
				})
				.addAction({
					$type: 'submit',
					schema: actionSchema,
					metadata: { name: 'Submit' },
					execute: async () => ({ success: true }),
				})
				.build();

			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.properties.steps.items.properties.elements.items.anyOf?.map(
				(item: { $ref?: string }) => item.$ref,
			)).toEqual(expect.arrayContaining(['#/$defs/element:text', '#/$defs/element:number']));

			expect(
				configSchema.properties.steps.items.properties.layout.$ref ||
					configSchema.properties.steps.items.properties.layout.anyOf?.[0]?.$ref,
			).toBe('#/$defs/layout:card');
			expect(
				configSchema.properties.stepper.$ref || configSchema.properties.stepper.anyOf?.[0]?.$ref,
			).toBe('#/$defs/stepper:wizard');

			const actionsItems = configSchema.properties.steps.items.properties.actions.items;
			expect(
				actionsItems.$ref === '#/$defs/action:submit' ||
					actionsItems.anyOf?.[0]?.$ref === '#/$defs/action:submit',
			).toBe(true);

			expectSchemaKeys(configSchema.$defs as Record<string, unknown>, [
				'element:text',
				'element:number',
				'layout:card',
				'stepper:wizard',
				'action:submit',
			]);
		});
	});
});
