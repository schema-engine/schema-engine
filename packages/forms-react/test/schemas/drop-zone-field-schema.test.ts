import { describe, expect, test } from 'vitest';
import {
	DropZoneFieldSchema,
	dropZoneFieldExample,
	type DropZoneFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-drop-zone.types';

describe('Drop zone field schema', () => {
	test('validates a complete configuration', () => {
		const config: DropZoneFieldConfig = {
			$type: 'drop-zone',
			id: 'upload',
			name: 'upload',
			label: 'Upload',
			maxFiles: 3,
			maxSize: 1024,
			minSize: 1,
			accept: { 'image/png': ['.png'] },
			disabled: false,
		};

		const result = DropZoneFieldSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	test('validates the documented example', () => {
		expect(DropZoneFieldSchema.safeParse(dropZoneFieldExample).success).toBe(true);
	});

	test('defaults maxFiles to 1', () => {
		const result = DropZoneFieldSchema.safeParse({
			$type: 'drop-zone',
			id: 'single',
			name: 'single',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.maxFiles).toBe(1);
		}
	});

	test('rejects wrong element type', () => {
		const result = DropZoneFieldSchema.safeParse({
			$type: 'input',
			id: 'upload',
			name: 'upload',
		});
		expect(result.success).toBe(false);
	});
});
