import { FormComposer } from '@schema-engine/forms/builder';

/**
 * Factory function to create a React form engine builder instance.
 * This provides a typed builder interface for React components.
 */
export function createReactFormComposer() {
	return new FormComposer();
}
