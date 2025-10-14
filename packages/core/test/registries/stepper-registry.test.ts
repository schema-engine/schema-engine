import { describe, test, expect, beforeEach } from 'bun:test';
import { StepperRegistry } from '@/registries';
import type { StepperRegistration } from '@/types';
import { z } from 'zod';

describe('StepperRegistry', () => {
	let registry: StepperRegistry;

	const mockStepper: StepperRegistration<{ showProgress: boolean }, any> = {
		__id: 'wizard-stepper',
		schema: z.object({ showProgress: z.boolean() }),
		metadata: {
			name: 'Wizard Stepper',
			description: 'A step-by-step wizard',
		},
		render: (props) => props,
	};

	const anotherStepper: StepperRegistration<{ vertical: boolean }, any> = {
		__id: 'vertical-stepper',
		schema: z.object({ vertical: z.boolean() }),
		metadata: {
			name: 'Vertical Stepper',
			description: 'A vertical stepper',
		},
		render: (props) => props,
	};

	beforeEach(() => {
		registry = new StepperRegistry();
	});

	describe('register', () => {
		test('should register a stepper', () => {
			registry.register(mockStepper);

			expect(registry.has('wizard-stepper')).toBe(true);
			expect(registry.get('wizard-stepper')).toEqual(mockStepper);
		});

		test('should allow registering multiple steppers', () => {
			registry.register(mockStepper);
			registry.register(anotherStepper);

			expect(registry.size).toBe(2);
		});
	});

	describe('get', () => {
		test('should retrieve registered stepper', () => {
			registry.register(mockStepper);
			expect(registry.get('wizard-stepper')).toEqual(mockStepper);
		});

		test('should return undefined for unregistered stepper', () => {
			expect(registry.get('non-existent')).toBeUndefined();
		});
	});

	describe('registryName', () => {
		test('should return correct registry name', () => {
			expect(registry.registryName).toBe('stepper');
		});
	});
});
