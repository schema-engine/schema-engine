import { test, expect, describe } from 'bun:test';
import {
	isSerializable,
	serializeFormConfig,
	deserializeFormConfig,
	type SerializableFormConfig,
} from '@/engine/serialization';

describe('Form Serialization', () => {
	describe('isSerializable', () => {
		test('should validate valid form configuration', () => {
			const config: SerializableFormConfig = {
				id: 'contact-form',
				title: 'Contact Form',
				fields: [
					{
						id: 'text',
						config: {
							name: 'username',
							label: 'Username',
						},
					},
				],
			};

			expect(isSerializable(config)).toBe(true);
		});

		test('should reject configuration without id', () => {
			const config = {
				title: 'Contact Form',
				fields: [],
			};

			expect(isSerializable(config)).toBe(false);
		});

		test('should reject configuration without fields', () => {
			const config = {
				id: 'form',
				title: 'Form',
			};

			expect(isSerializable(config)).toBe(false);
		});

		test('should reject configuration with non-array fields', () => {
			const config = {
				id: 'form',
				fields: 'not-an-array',
			};

			expect(isSerializable(config)).toBe(false);
		});

		test('should reject fields without id', () => {
			const config = {
				id: 'form',
				fields: [
					{
						config: { name: 'test' },
					},
				],
			};

			expect(isSerializable(config)).toBe(false);
		});

		test('should reject fields without config', () => {
			const config = {
				id: 'form',
				fields: [
					{
						id: 'text',
					},
				],
			};

			expect(isSerializable(config)).toBe(false);
		});

		test('should validate form with optional properties', () => {
			const config: SerializableFormConfig = {
				id: 'form',
				title: 'My Form',
				description: 'A test form',
				fields: [],
				layout: {
					id: 'card',
					config: { maxWidth: '600px' },
				},
				stepper: {
					id: 'wizard',
					config: { showProgress: true },
				},
				actions: [
					{
						id: 'submit',
						config: { endpoint: '/api/submit' },
						triggers: ['form_submit'],
					},
				],
				metadata: {
					version: '1.0.0',
					author: 'Test Author',
				},
			};

			expect(isSerializable(config)).toBe(true);
		});
	});

	describe('serializeFormConfig', () => {
		test('should serialize form to JSON string', () => {
			const config: SerializableFormConfig = {
				id: 'test-form',
				title: 'Test Form',
				fields: [
					{
						id: 'text',
						config: {
							name: 'username',
							label: 'Username',
						},
					},
				],
			};

			const json = serializeFormConfig(config);

			expect(typeof json).toBe('string');
			expect(json).toContain('"id"');
			expect(json).toContain('"test-form"');
			expect(json).toContain('"username"');
		});

		test('should produce pretty-printed JSON', () => {
			const config: SerializableFormConfig = {
				id: 'test-form',
				fields: [],
			};

			const json = serializeFormConfig(config);

			// Should have indentation (not minified)
			expect(json).toContain('\n');
			expect(json).toContain('  ');
		});

		test('should serialize complex configuration', () => {
			const config: SerializableFormConfig = {
				id: 'complex-form',
				title: 'Complex Form',
				description: 'A complex form with all features',
				fields: [
					{
						id: 'text',
						config: {
							name: 'name',
							label: 'Name',
							required: true,
						},
					},
					{
						id: 'email',
						config: {
							name: 'email',
							label: 'Email',
							validation: [
								{ type: 'required', message: 'Email is required' },
								{ type: 'email', message: 'Invalid email' },
							],
						},
					},
				],
				layout: {
					id: 'card',
					config: { maxWidth: '600px' },
				},
				actions: [
					{
						id: 'submit',
						config: { endpoint: '/api/submit' },
						triggers: ['form_submit'],
					},
				],
			};

			const json = serializeFormConfig(config);
			const parsed = JSON.parse(json);

			expect(parsed.id).toBe('complex-form');
			expect(parsed.fields).toHaveLength(2);
			expect(parsed.layout.id).toBe('card');
			expect(parsed.actions).toHaveLength(1);
		});
	});

	describe('deserializeFormConfig', () => {
		test('should deserialize valid JSON', () => {
			const json = JSON.stringify({
				id: 'test-form',
				fields: [
					{
						id: 'text',
						config: { name: 'test' },
					},
				],
			});

			const config = deserializeFormConfig(json);

			expect(config.id).toBe('test-form');
			expect(config.fields).toHaveLength(1);
			expect(config.fields[0].id).toBe('text');
		});

		test('should throw error for invalid JSON', () => {
			const invalidJson = '{ invalid json }';

			expect(() => {
				deserializeFormConfig(invalidJson);
			}).toThrow();
		});

		test('should throw error for invalid configuration', () => {
			const json = JSON.stringify({
				title: 'No ID',
				fields: [],
			});

			expect(() => {
				deserializeFormConfig(json);
			}).toThrow('Invalid form configuration');
		});

		test('should preserve all optional fields', () => {
			const config: SerializableFormConfig = {
				id: 'test-form',
				title: 'Test Form',
				description: 'Description',
				fields: [],
				layout: {
					id: 'card',
					config: {},
				},
				stepper: {
					id: 'wizard',
					config: {},
				},
				actions: [
					{
						id: 'submit',
						config: {},
					},
				],
				metadata: {
					custom: 'value',
				},
			};

			const json = serializeFormConfig(config);
			const deserialized = deserializeFormConfig(json);

			expect(deserialized.title).toBe('Test Form');
			expect(deserialized.description).toBe('Description');
			expect(deserialized.layout).toBeDefined();
			expect(deserialized.stepper).toBeDefined();
			expect(deserialized.actions).toBeDefined();
			expect(deserialized.metadata).toBeDefined();
		});
	});

	describe('Round-trip Serialization', () => {
		test('should maintain data integrity through serialize/deserialize cycle', () => {
			const original: SerializableFormConfig = {
				id: 'contact-form',
				title: 'Contact Form',
				description: 'Get in touch with us',
				fields: [
					{
						id: 'text',
						config: {
							name: 'name',
							label: 'Your Name',
							required: true,
						},
					},
					{
						id: 'email',
						config: {
							name: 'email',
							label: 'Email Address',
							required: true,
						},
					},
					{
						id: 'textarea',
						config: {
							name: 'message',
							label: 'Message',
							rows: 5,
						},
					},
				],
				layout: {
					id: 'card',
					config: {
						maxWidth: '600px',
						padding: '2rem',
					},
				},
				actions: [
					{
						id: 'submit',
						config: {
							endpoint: '/api/contact',
							method: 'POST',
						},
						triggers: ['form_submit'],
					},
					{
						id: 'reset',
						config: {
							confirmMessage: 'Are you sure?',
						},
						triggers: ['manual_reset'],
					},
				],
				metadata: {
					version: '1.0.0',
					author: 'Test Team',
					createdAt: '2025-10-10T00:00:00Z',
				},
			};

			// Serialize
			const json = serializeFormConfig(original);

			// Deserialize
			const deserialized = deserializeFormConfig(json);

			// Compare
			expect(deserialized.id).toBe(original.id);
			expect(deserialized.title).toBe(original.title);
			expect(deserialized.description).toBe(original.description);
			expect(deserialized.fields).toHaveLength(original.fields.length);
			expect(deserialized.layout?.id).toBe(original.layout?.id);
			expect(deserialized.actions).toHaveLength(original.actions?.length || 0);
			expect(deserialized.metadata?.version).toBe(original.metadata?.version);
		});

		test('should handle minimal configuration', () => {
			const original: SerializableFormConfig = {
				id: 'minimal',
				fields: [],
			};

			const json = serializeFormConfig(original);
			const deserialized = deserializeFormConfig(json);

			expect(deserialized.id).toBe('minimal');
			expect(deserialized.fields).toHaveLength(0);
		});

		test('should handle deeply nested config objects', () => {
			const original: SerializableFormConfig = {
				id: 'nested-form',
				fields: [
					{
						id: 'complex',
						config: {
							name: 'complex',
							nested: {
								deep: {
									value: 'test',
									array: [1, 2, 3],
									object: {
										key: 'value',
									},
								},
							},
						},
					},
				],
			};

			const json = serializeFormConfig(original);
			const deserialized = deserializeFormConfig(json);

			expect(deserialized.fields[0].config).toEqual(original.fields[0].config);
		});
	});
});
