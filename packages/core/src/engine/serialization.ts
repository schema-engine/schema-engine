/**
 * Serialization utilities for form configurations.
 *
 * These utilities help convert form configurations to/from JSON
 * for storage, transmission, or external manipulation.
 */

/**
 * Serializable form configuration.
 *
 * This is the JSON-compatible form configuration that can be stored
 * in databases, transmitted over HTTP, or edited in external tools.
 */
export interface SerializableFormConfig {
	/** Unique form identifier */
	id: string;
	/** Form title */
	title?: string;
	/** Form description */
	description?: string;
	/** Form fields configuration */
	fields: SerializableFieldConfig[];
	/** Layout configuration */
	layout?: {
		id: string;
		config?: Record<string, unknown>;
	};
	/** Stepper configuration for multi-step forms */
	stepper?: {
		id: string;
		config?: Record<string, unknown>;
	};
	/** Actions to execute on various triggers */
	actions?: SerializableActionConfig[];
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Serializable field configuration.
 */
export interface SerializableFieldConfig {
	/** Element component ID */
	id: string;
	/** Element configuration */
	config: Record<string, unknown>;
}

/**
 * Serializable action configuration.
 */
export interface SerializableActionConfig {
	/** Action type */
	id: string;
	/** Action configuration */
	config: Record<string, unknown>;
	/** Triggers that execute this action */
	triggers?: string[];
}

/**
 * Validate that a form configuration is serializable.
 *
 * @param config - Form configuration to validate
 * @returns True if serializable, false otherwise
 */
export function isSerializable(config: unknown): config is SerializableFormConfig {
	if (!config || typeof config !== 'object') {
		return false;
	}

	const c = config as Record<string, unknown>;

	// Check required fields
	if (typeof c.id !== 'string') {
		return false;
	}

	if (!Array.isArray(c.fields)) {
		return false;
	}

	// Validate fields
	for (const field of c.fields) {
		if (!field || typeof field !== 'object') {
			return false;
		}
		const f = field as Record<string, unknown>;
		if (typeof f.id !== 'string' || typeof f.config !== 'object') {
			return false;
		}
	}

	return true;
}

/**
 * Serialize a form configuration to JSON.
 *
 * @param config - Form configuration to serialize
 * @returns JSON string
 */
export function serializeFormConfig(config: SerializableFormConfig): string {
	return JSON.stringify(config, null, 2);
}

/**
 * Deserialize a form configuration from JSON.
 *
 * @param json - JSON string to deserialize
 * @returns Form configuration
 * @throws Error if JSON is invalid or not a valid form configuration
 */
export function deserializeFormConfig(json: string): SerializableFormConfig {
	const config = JSON.parse(json);

	if (!isSerializable(config)) {
		throw new Error('Invalid form configuration');
	}

	return config;
}
