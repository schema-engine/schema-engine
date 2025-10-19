import { describe, test, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { FormEngineBuilder } from '@/builder/form-engine-builder';
import type { ElementRegistration, LayoutRegistration, StepperRegistration, BuilderActionRegistration } from '@/types';

describe('FormEngine JSON Schema Generation', () => {
	describe('Basic Schema Generation', () => {
		test('should generate JSON schema from empty engine', () => {
			const engine = new FormEngineBuilder().build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema).toBeDefined();
			expect(schema.schemas).toBeDefined();
		});

		test('should generate schema with single element', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
				placeholder: z.string().optional(),
			});

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'A text input field',
					category: 'input',
				},
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas).toBeDefined();
			expect(schema.schemas['element:text']).toBeDefined();
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

			const textInputRegistration: ElementRegistration = {
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

			const engine = new FormEngineBuilder()
				.addElement(textInputRegistration)
				.addLayout(cardLayoutRegistration)
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:text']).toBeDefined();
			expect(schema.schemas['layout:card']).toBeDefined();
		});
	});

	describe('Schema Metadata', () => {
		test('should include metadata in generated schema', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const textInputRegistration: ElementRegistration = {
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

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schemaRegistry = engine.getSchemaRegistry();
			const registeredMetadata = schemaRegistry.get(textInputSchema);

			expect(registeredMetadata).toBeDefined();
			expect(registeredMetadata?.id).toBe('element:text');
			expect(registeredMetadata?.componentType).toBe('element');
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

			const textInputRegistration: ElementRegistration = {
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

			const engine = new FormEngineBuilder()
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
			const actionSchema = z.object({ $type: z.literal('submit'), endpoint: z.string().url() });

			const elementReg: ElementRegistration = {
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

			const engine = new FormEngineBuilder()
				.addElement(elementReg)
				.addLayout(layoutReg)
				.addStepper(stepperReg)
				.addAction(actionReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();

            console.log(schema);

			expect(schema.schemas['element:text']).toBeDefined();
			expect(schema.schemas['layout:card']).toBeDefined();
			expect(schema.schemas['stepper:wizard']).toBeDefined();
			expect(schema.schemas['action:submit']).toBeDefined();
		});
	});

	describe('Schema Options', () => {
		test('should support different JSON Schema versions', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schemaDraft7 = engine.generateJSONSchema({ target: 'draft-7' });
			const schemaDraft2020 = engine.generateJSONSchema({ target: 'draft-2020-12' });
			const schemaOpenAPI = engine.generateJSONSchema({ target: 'openapi-3.0' });

			expect(schemaDraft7).toBeDefined();
			expect(schemaDraft2020).toBeDefined();
			expect(schemaOpenAPI).toBeDefined();
		});

		test('should support custom URI generation', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection({
				uri: (id: string) => `https://api.example.com/schemas/${id}.json`,
			});

			expect(schema).toBeDefined();
		});

		test('should use default options when none provided', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema).toBeDefined();
			expect(schema.schemas).toBeDefined();
		});
	});

	describe('Schema Registry Access', () => {
		test('should provide access to schema registry', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const registry = engine.getSchemaRegistry();

			expect(registry).toBeDefined();
			expect(registry.has(textInputSchema)).toBe(true);
		});

		test('should allow querying registered schemas', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const emailInputSchema = z.object({
				$type: z.literal('email'),
			});

			const textInputReg: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailInputReg: ElementRegistration = {
				$type: 'email',
				schema: emailInputSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputReg).addElement(emailInputReg).build();

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

			const complexRegistration: ElementRegistration = {
				$type: 'complex',
				schema: complexSchema,
				metadata: { name: 'Complex Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(complexRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:complex']).toBeDefined();
		});

		test('should handle schemas with enums and unions', () => {
			const enumSchema = z.object({
				$type: z.literal('select'),
				size: z.enum(['sm', 'md', 'lg']).optional(),
				variant: z.union([z.literal('primary'), z.literal('secondary'), z.literal('tertiary')]).optional(),
			});

			const enumRegistration: ElementRegistration = {
				$type: 'select',
				schema: enumSchema,
				metadata: { name: 'Select Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(enumRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:select']).toBeDefined();
		});
	});

	describe('Multiple Elements', () => {
		test('should handle multiple elements of the same category', () => {
			const textSchema = z.object({ $type: z.literal('text') });
			const emailSchema = z.object({ $type: z.literal('email') });
			const passwordSchema = z.object({ $type: z.literal('password') });

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailReg: ElementRegistration = {
				$type: 'email',
				schema: emailSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const passwordReg: ElementRegistration = {
				$type: 'password',
				schema: passwordSchema,
				metadata: { name: 'Password Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder()
				.addElement(textReg)
				.addElement(emailReg)
				.addElement(passwordReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:text']).toBeDefined();
			expect(schema.schemas['element:email']).toBeDefined();
			expect(schema.schemas['element:password']).toBeDefined();
		});

		test('should inspect actual schema structure', () => {
			const textSchema = z.object({ $type: z.literal('text') });
			const emailSchema = z.object({ $type: z.literal('email') });

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailReg: ElementRegistration = {
				$type: 'email',
				schema: emailSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).addElement(emailReg).build();

			const schema = engine.generateJSONSchemaCollection();

			console.log('\n=== Generated Schema Structure ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('===================================\n');

			// Schema should be an object with 'schemas' property
			expect(schema).toHaveProperty('schemas');
			expect(typeof schema.schemas).toBe('object');
		});

		test('should handle elements from different categories', () => {
			const inputSchema = z.object({ $type: z.literal('text') });
			const headingSchema = z.object({ $type: z.literal('heading') });
			const dividerSchema = z.object({ $type: z.literal('divider') });
			const buttonSchema = z.object({ $type: z.literal('button') });

			const inputReg: ElementRegistration = {
				$type: 'text',
				schema: inputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const headingReg: ElementRegistration = {
				$type: 'heading',
				schema: headingSchema,
				metadata: { name: 'Heading', category: 'content' },
				render: () => null,
			};

			const dividerReg: ElementRegistration = {
				$type: 'divider',
				schema: dividerSchema,
				metadata: { name: 'Divider', category: 'decoration' },
				render: () => null,
			};

			const buttonReg: ElementRegistration = {
				$type: 'button',
				schema: buttonSchema,
				metadata: { name: 'Button', category: 'interactive' },
				render: () => null,
			};

			const engine = new FormEngineBuilder()
				.addElement(inputReg)
				.addElement(headingReg)
				.addElement(dividerReg)
				.addElement(buttonReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();
			const registry = engine.getSchemaRegistry();

			expect(schema.schemas['element:text']).toBeDefined();
			expect(schema.schemas['element:heading']).toBeDefined();
			expect(schema.schemas['element:divider']).toBeDefined();
			expect(schema.schemas['element:button']).toBeDefined();

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

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'A text input field',
					category: 'input',
				},
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schema = engine.generateJSONSchemaCollection();

			console.log('\n=== Single Element Schema ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('============================\n');

			expect(schema).toBeDefined();
		});

		test('should check if schemas are properly interlinked', () => {
			// Create a schema that references another schema
			const addressSchema = z.object({
				$type: z.literal('address'),
				street: z.string(),
				city: z.string(),
			});

			const personSchema = z.object({
				$type: z.literal('person'),
				name: z.string(),
				address: addressSchema, // This should create a $ref
			});

			const addressReg: ElementRegistration = {
				$type: 'address',
				schema: addressSchema,
				metadata: { name: 'Address', category: 'input' },
				render: () => null,
			};

			const personReg: ElementRegistration = {
				$type: 'person',
				schema: personSchema,
				metadata: { name: 'Person', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(addressReg).addElement(personReg).build();

			const schema = engine.generateJSONSchemaCollection();

			console.log('\n=== Nested Schema with References ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('=====================================\n');

			expect(schema.schemas['element:address']).toBeDefined();
			expect(schema.schemas['element:person']).toBeDefined();
		});

		test('should verify URI generation for $ref', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const textInputRegistration: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					category: 'input',
				},
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textInputRegistration).build();

			const schemaWithDefaultURI = engine.generateJSONSchemaCollection();

			const schemaWithCustomURI = engine.generateJSONSchemaCollection({
				uri: (id) => `https://api.example.com/schemas/${id}.json`,
			});

			console.log('\n=== Schema with Default URI ===');
			console.log(JSON.stringify(schemaWithDefaultURI, null, 2));
			console.log('\n=== Schema with Custom URI ===');
			console.log(JSON.stringify(schemaWithCustomURI, null, 2));
			console.log('===============================\n');

			expect(schemaWithDefaultURI).toBeDefined();
			expect(schemaWithCustomURI).toBeDefined();
		});

		test('should generate proper JSON Schema format with all component types', () => {
			const elementSchema = z.object({ $type: z.literal('text'), label: z.string().optional() });
			const layoutSchema = z.object({ $type: z.literal('card'), padding: z.enum(['sm', 'md', 'lg']).optional() });
			const stepperSchema = z.object({ $type: z.literal('wizard'), showProgress: z.boolean().optional() });
			const actionSchema = z.object({
				$type: z.literal('submit'),
				endpoint: z.string().url(),
				method: z.enum(['GET', 'POST']).optional(),
			});

			const elementReg: ElementRegistration = {
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

			const engine = new FormEngineBuilder()
				.addElement(elementReg)
				.addLayout(layoutReg)
				.addStepper(stepperReg)
				.addAction(actionReg)
				.build();

			const schema = engine.generateJSONSchemaCollection();

			console.log('\n=== Complete Schema with All Types ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('======================================\n');

			// Check structure
			expect(schema).toHaveProperty('schemas');
			expect(Object.keys(schema.schemas)).toContain('element:text');
			expect(Object.keys(schema.schemas)).toContain('layout:card');
			expect(Object.keys(schema.schemas)).toContain('stepper:wizard');
			expect(Object.keys(schema.schemas)).toContain('action:submit');
		});
	});

	describe('Unified JSON Schema Format', () => {
		test('should generate unified schema with $defs', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string().optional(),
			});

			const emailInputSchema = z.object({
				$type: z.literal('email'),
				required: z.boolean().optional(),
			});

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const emailReg: ElementRegistration = {
				$type: 'email',
				schema: emailInputSchema,
				metadata: { name: 'Email Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).addElement(emailReg).build();

			const schema = engine.generateJSONSchema();

			console.log('\n=== Unified Schema with $defs ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('=================================\n');

			// Should have root properties
			expect(schema).toHaveProperty('$schema');
			expect(schema).toHaveProperty('$id');
			expect(schema).toHaveProperty('type');
			expect(schema.type).toBe('object');

			// Should have form configuration properties
			expect(schema).toHaveProperty('properties');
			expect(schema.properties).toHaveProperty('id');
			expect(schema.properties).toHaveProperty('elements');
			expect(schema.properties).toHaveProperty('layout');

			// Should have $defs with all components
			expect(schema).toHaveProperty('$defs');
			expect(schema.$defs).toHaveProperty('element:text');
			expect(schema.$defs).toHaveProperty('element:email');
		});

		test('should use $ref in form schema for elements', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).build();

			const schema = engine.generateJSONSchema() as any;

			// Elements array should reference component schemas
			expect(schema.properties?.elements?.items?.oneOf).toBeDefined();
			expect(schema.properties?.elements?.items?.oneOf?.[0]?.$ref).toBe('#/$defs/element:text');
		});

		test('should generate schema for all component types with proper $ref', () => {
			const elementSchema = z.object({ $type: z.literal('text') });
			const layoutSchema = z.object({ $type: z.literal('card') });
			const stepperSchema = z.object({ $type: z.literal('wizard') });
			const actionSchema = z.object({ $type: z.literal('submit') });

			const elementReg: ElementRegistration = {
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

			const engine = new FormEngineBuilder()
				.addElement(elementReg)
				.addLayout(layoutReg)
				.addStepper(stepperReg)
				.addAction(actionReg)
				.build();

			const schema = engine.generateJSONSchema() as any;

			console.log('\n=== Complete Unified Schema ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('===============================\n');

			// Check $defs
			expect(schema.$defs?.['element:text']).toBeDefined();
			expect(schema.$defs?.['layout:card']).toBeDefined();
			expect(schema.$defs?.['stepper:wizard']).toBeDefined();
			expect(schema.$defs?.['action:submit']).toBeDefined();

			// Check $ref usage
			expect(schema.properties?.elements?.items?.oneOf?.[0]?.$ref).toBe('#/$defs/element:text');
			expect(schema.properties?.layout?.oneOf?.[0]?.$ref).toBe('#/$defs/layout:card');
			expect(schema.properties?.stepper?.oneOf?.[0]?.$ref).toBe('#/$defs/stepper:wizard');
			expect(schema.properties?.actions?.items?.oneOf?.[0]?.$ref).toBe('#/$defs/action:submit');
		});

		test('should allow generating just component schemas without form structure', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).build();

			const schema = engine.generateJSONSchema({ includeFormSchema: false });

			console.log('\n=== Components Only (No Form Schema) ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('========================================\n');

			// Should have $defs but not form properties
			expect(schema).toHaveProperty('$defs');
			expect(schema.$defs['element:text']).toBeDefined();
			expect(schema).not.toHaveProperty('properties');
			expect(schema.title).toBe('Form Engine Components');
		});

		test('should generate schema collection for external distribution', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
			});

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).build();

			const collection = engine.generateJSONSchemaCollection();

			console.log('\n=== Schema Collection (Separate Files) ===');
			console.log(JSON.stringify(collection, null, 2));
			console.log('==========================================\n');

			// Should be a collection of independent schemas
			expect(collection).toHaveProperty('schemas');
			expect(collection.schemas['element:text']).toBeDefined();
			expect(collection.schemas['element:text'].$id).toBe('#/definitions/element:text');
		});
	});

	describe('Form Config Schema', () => {
		test('should generate schema for form configuration object', () => {
			const textInputSchema = z.object({
				$type: z.literal('text'),
				label: z.string(),
				required: z.boolean().optional(),
			});

			const textReg: ElementRegistration = {
				$type: 'text',
				schema: textInputSchema,
				metadata: { name: 'Text Input', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).build();

			const configSchema = engine.generateFormConfigSchema();

			console.log('\n=== Form Config Schema ===');
			console.log(JSON.stringify(configSchema, null, 2));
			console.log('==========================\n');

			// Should have form structure
			expect(configSchema.$id).toBe('form-config-schema');
			expect(configSchema.type).toBe('object');
			expect(configSchema.properties).toHaveProperty('id');
			expect(configSchema.properties).toHaveProperty('elements');
			expect(configSchema.required).toContain('id');
			expect(configSchema.required).toContain('elements');

			// Should have $defs with components
			expect(configSchema.$defs).toBeDefined();
			expect(configSchema.$defs['element:text']).toBeDefined();

			// Elements should reference component schemas
			expect((configSchema.properties as any).elements.items.oneOf).toBeDefined();
			expect((configSchema.properties as any).elements.items.oneOf[0].$ref).toBe(
				'#/$defs/element:text',
			);
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

			const textReg: ElementRegistration = {
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

			const engine = new FormEngineBuilder().addElement(textReg).addLayout(cardReg).build();

			const configSchema = engine.generateFormConfigSchema();

			// Schema should describe this structure:
			const expectedConfig = {
				id: 'contact-form',
				title: 'Contact Form',
				elements: [
					{ $type: 'text', label: 'Name' },
					{ $type: 'text', label: 'Email' },
				],
				layout: { $type: 'card', padding: 16 },
			};

			// Verify schema has correct structure for this config
			expect(configSchema.properties).toHaveProperty('id');
			expect(configSchema.properties).toHaveProperty('title');
			expect(configSchema.properties).toHaveProperty('elements');
			expect(configSchema.properties).toHaveProperty('layout');
			expect((configSchema.properties as any).elements.type).toBe('array');
		});

		test('should include metadata field in config schema', () => {
			const textReg: ElementRegistration = {
				$type: 'text',
				schema: z.object({ $type: z.literal('text') }),
				metadata: { name: 'Text', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).build();
			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.properties).toHaveProperty('metadata');
			expect((configSchema.properties as any).metadata.type).toBe('object');
			expect((configSchema.properties as any).metadata.additionalProperties).toBe(true);
		});

		test('should support additionalProperties option', () => {
			const textReg: ElementRegistration = {
				$type: 'text',
				schema: z.object({ $type: z.literal('text') }),
				metadata: { name: 'Text', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(textReg).build();

			const strictSchema = engine.generateFormConfigSchema({ additionalProperties: false });
			expect(strictSchema.additionalProperties).toBe(false);

			const flexibleSchema = engine.generateFormConfigSchema({ additionalProperties: true });
			expect(flexibleSchema.additionalProperties).toBe(true);
		});

		test('should work with multiple elements and all component types', () => {
			const textSchema = z.object({ $type: z.literal('text'), label: z.string() });
			const numberSchema = z.object({ $type: z.literal('number'), min: z.number() });
			const layoutSchema = z.object({ $type: z.literal('card') });
			const stepperSchema = z.object({ $type: z.literal('wizard') });
			const actionSchema = z.object({ $type: z.literal('submit') });

			const engine = new FormEngineBuilder()
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

			console.log('\n=== Complete Form Config Schema ===');
			console.log(JSON.stringify(configSchema, null, 2));
			console.log('===================================\n');

			// Should have all component types
			expect((configSchema.properties as any).elements.items.oneOf).toHaveLength(2);
			expect((configSchema.properties as any).layout.oneOf).toHaveLength(1);
			expect((configSchema.properties as any).stepper.oneOf).toHaveLength(1);
			expect((configSchema.properties as any).actions.items.oneOf).toHaveLength(1);

			// Should have all defs
			expect(configSchema.$defs['element:text']).toBeDefined();
			expect(configSchema.$defs['element:number']).toBeDefined();
			expect(configSchema.$defs['layout:card']).toBeDefined();
			expect(configSchema.$defs['stepper:wizard']).toBeDefined();
			expect(configSchema.$defs['action:submit']).toBeDefined();
		});
	});
});
