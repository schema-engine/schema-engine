import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ComponentType } from './component-type';

/**
 * Metadata entry for a registered component schema.
 * Used by JSON Schema collection and tooling without coupling to Zod's registry.
 */
export interface SchemaMetadataEntry {
	id: string;
	title: string;
	description?: string;
	componentType: ComponentType;
	category?: string;
}

/**
 * Catalog of schema metadata keyed by stable component ids (e.g. `element:text`).
 * Replaces direct use of `z.registry()` for metadata storage in engine construction.
 */
export class SchemaMetadataCatalog {
	private entries = new Map<string, SchemaMetadataEntry>();
	private schemasById = new Map<string, StandardSchemaV1>();
	private idBySchema = new WeakMap<object, string>();

	/**
	 * Associate a validator schema with catalog metadata.
	 */
	register(schema: StandardSchemaV1, entry: SchemaMetadataEntry): void {
		const previousSchema = this.schemasById.get(entry.id);
		if (previousSchema && previousSchema !== schema) {
			this.idBySchema.delete(previousSchema);
		}
		this.entries.set(entry.id, entry);
		this.schemasById.set(entry.id, schema);
		this.idBySchema.set(schema, entry.id);
	}

	/** Create an independent catalog with the same schema and metadata entries. */
	clone(): SchemaMetadataCatalog {
		const catalog = new SchemaMetadataCatalog();
		for (const { schema, entry } of this.getRegisteredSchemas()) {
			catalog.register(schema, entry);
		}
		return catalog;
	}

	get(id: string): SchemaMetadataEntry | undefined {
		return this.entries.get(id);
	}

	getBySchema(schema: StandardSchemaV1): SchemaMetadataEntry | undefined {
		const id = this.idBySchema.get(schema);
		return id ? this.entries.get(id) : undefined;
	}

	getAll(): SchemaMetadataEntry[] {
		return Array.from(this.entries.values());
	}

	has(schema: StandardSchemaV1): boolean {
		return this.idBySchema.has(schema);
	}

	/**
	 * All registered schema/metadata pairs for adapters (e.g. z.registry bridge).
	 */
	getRegisteredSchemas(): Array<{ schema: StandardSchemaV1; entry: SchemaMetadataEntry }> {
		return Array.from(this.schemasById.entries()).map(([id, schema]) => ({
			schema,
			entry: this.entries.get(id)!,
		}));
	}
}
