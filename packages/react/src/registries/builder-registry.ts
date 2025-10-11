import { FormEngineBuilder } from '@json-form-engine/core/builder';

/**
 * Factory function to create a React form engine builder instance.
 * This provides a typed builder interface for React components.
 */
export function createReactFormEngine() {
	return new FormEngineBuilder();
}
