/**
 * Array Element Strategy Registry
 *
 * This system allows developers to define custom strategies for what field types
 * can be included in array elements. This is extensible and reusable across
 * multiple components that need array functionality.
 */

import { z } from 'zod';

declare global {
	namespace FormEngine {
		/**
		 * Array element strategy registry
		 * Developers can register different strategies for what elements are allowed in arrays
		 */
		interface ArrayElementStrategies {
			// Core strategies will be registered by default
			// Users can add their own:
			// myCustomStrategy: z.ZodSchema<MyAllowedElements[]>
		}

		/**
		 * Available array element strategy names
		 */
		type ArrayElementStrategyName = keyof ArrayElementStrategies;

		/**
		 * Get the element type for a specific strategy
		 */
		type GetArrayElementType<T extends ArrayElementStrategyName> = ArrayElementStrategies[T] extends z.ZodArray<
			infer U
		>
			? U
			: never;
	}
}

/**
 * Array element strategy registry implementation
 */
class ArrayElementStrategyRegistry {
	private strategies = new Map<string, z.ZodSchema<any>>();

	/**
	 * Register a new array element strategy
	 * @param name - Strategy name
	 * @param schema - Zod schema defining what elements are allowed
	 */
	registerStrategy<T extends string>(name: T, schema: z.ZodSchema<any>): void {
		this.strategies.set(name, schema);
	}

	/**
	 * Get schema for a registered strategy
	 */
	getStrategy(name: string): z.ZodSchema<any> | undefined {
		return this.strategies.get(name);
	}

	/**
	 * Get all registered strategy names
	 */
	getStrategies(): string[] {
		return Array.from(this.strategies.keys());
	}

	/**
	 * Create an array schema using a specific strategy
	 * @param strategyName - Name of the strategy to use
	 * @param options - Array options (min/max items, etc.)
	 */
	createArraySchema(
		strategyName: string,
		options: {
			minItems?: number;
			maxItems?: number;
		} = {},
	): z.ZodArray<any> | null {
		const elementSchema = this.getStrategy(strategyName);
		if (!elementSchema) {
			return null;
		}

		let arraySchema = z.array(elementSchema);

		if (options.minItems !== undefined) {
			arraySchema = arraySchema.min(options.minItems);
		}

		if (options.maxItems !== undefined) {
			arraySchema = arraySchema.max(options.maxItems);
		}

		return arraySchema;
	}
}

/**
 * Global array element strategy registry instance
 */
export const arrayElementStrategyRegistry = new ArrayElementStrategyRegistry();

/**
 * Helper function to register a new array element strategy
 */
export function registerArrayElementStrategy<T extends string>(name: T, schema: z.ZodSchema<any>): void {
	arrayElementStrategyRegistry.registerStrategy(name, schema);
}

/**
 * Helper function to create array schema with a strategy
 */
export function createArraySchemaWithStrategy(
	strategyName: FormEngine.ArrayElementStrategyName,
	options?: {
		minItems?: number;
		maxItems?: number;
	},
): z.ZodArray<any> | null {
	return arrayElementStrategyRegistry.createArraySchema(strategyName, options);
}
