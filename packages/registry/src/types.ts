import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Universal metadata for all registrations.
 */
export interface RegistrationMetadata {
	/** Human-readable display name */
	name: string;
	/** Detailed description of the component's purpose */
	description?: string;
}

/**
 * Universal metadata for visual components.
 */
export interface ComponentMetadata extends RegistrationMetadata {
	/** Icon identifier for UI display */
	icon?: string;
	/** Tags for filtering and searching */
	tags?: string[];
	/** Version of the component */
	version?: string;
}

/** Brand symbol for compile-time type discrimination (erased at runtime) */
declare const __brand: unique symbol;

/**
 * Phantom type brand - adds compile-time type identity without runtime cost.
 */
export type Brand<T, TBrand> = T & { readonly [__brand]?: TBrand };

/**
 * Base registration interface - common fields for all registration types.
 */
export interface BaseRegistration<TConfig = unknown, TMeta extends RegistrationMetadata = ComponentMetadata> {
	/** Unique identifier - MUST be unique within its registry type. */
	$type: string;
	/** Standard Schema for config validation and type inference */
	schema: StandardSchemaV1<TConfig>;
	/** Registration metadata (display name, description, and type-specific fields) */
	metadata: TMeta;
}

/**
 * Component registration interface.
 * Foundation for all component registrations.
 */
export interface ComponentRegistration<
	TType extends string = string,
	TConfig = unknown,
	TProps = unknown,
	TMeta extends ComponentMetadata = ComponentMetadata,
> extends BaseRegistration<TConfig, TMeta> {
	/** Framework-agnostic render function */
	render: (props: TProps) => unknown;
	/** Type identifier - enforced to match registry key */
	$type: TType;
}
