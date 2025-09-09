import { test, expect, describe } from 'bun:test';
import {
	serializeFormConfig,
	deserializeFormConfig,
	validateSerializableConfig,
} from '@/lib/form-engine/serialization';
import type { FormConfig } from '@/lib/form-engine';

describe('Serialization', () => {
	const mockFormConfig: FormConfig = {
		id: 'test-form',
		title: 'Test Form',
		description: 'A test form',
		mode: 'free',
		autoGenerateSchema: true,
		steps: [
			{
				id: 'step1',
				title: 'Step 1',
				fields: [
					{ type: 'input', inputType: 'text', id: 'name', name: 'name', label: 'Name', validation: [] },
					{ type: 'input', inputType: 'email', id: 'email', name: 'email', label: 'Email', validation: [] },
					{ type: 'number', id: 'age', name: 'age', label: 'Age', validation: [] },
				],
			},
		],
	};
	describe('serializeFormConfig', () => {
		test('should serialize form config to JSON', () => {
			const serialized = serializeFormConfig(mockFormConfig);
			expect(serialized).toBeTypeOf('string');
			expect(JSON.parse(serialized)).toEqual(expect.objectContaining({ id: 'test-form' }));
		});
	});
	describe('deserializeFormConfig', () => {
		test('should deserialize JSON to form config', () => {
			const serialized = serializeFormConfig(mockFormConfig);
			const deserialized = deserializeFormConfig(serialized);
			expect(deserialized).toEqual(expect.objectContaining({ id: 'test-form' }));
		});
		test('should throw on invalid JSON', () => {
			expect(() => deserializeFormConfig('invalid json')).toThrow();
		});
	});
	describe('validateSerializableConfig', () => {
		test('should validate a correct config', () => {
			const serializable = JSON.parse(serializeFormConfig(mockFormConfig));
			const result = validateSerializableConfig(serializable);
			expect(result.valid).toBe(true);
		});
		test('should fail for missing id', () => {
			const badConfig: any = { ...mockFormConfig, id: undefined };
			const serializable = JSON.parse(serializeFormConfig(badConfig));
			const result = validateSerializableConfig(serializable);
			expect(result.valid).toBe(false);
		});
	});
});
