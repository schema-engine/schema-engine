import type { AutoSaveStorage } from "@/lib/form-engine/actions/plugins/auto-save-plugin";

/**
 * Mock storage implementation for testing auto-save functionality
 */
export class MockAutoSaveStorage implements AutoSaveStorage {
	private data: Record<string, unknown> = {};

	async save(key: string, data: unknown): Promise<void> {
		this.data[key] = data;
	}

	async load(key: string): Promise<unknown> {
		return this.data[key] || null;
	}

	async remove(key: string): Promise<void> {
		delete this.data[key];
	}

	getStoredData(key: string): unknown {
		return this.data[key];
	}

	clear(): void {
		this.data = {};
	}

	getAllKeys(): string[] {
		return Object.keys(this.data);
	}

	hasKey(key: string): boolean {
		return key in this.data;
	}

	getStorageSize(): number {
		return Object.keys(this.data).length;
	}
}

/**
 * Creates a failing storage implementation for error testing
 */
export const createFailingStorage = (errorMessage: string = "Storage failed"): AutoSaveStorage => {
	return {
		save: async () => {
			throw new Error(errorMessage);
		},
		load: async () => null,
		remove: async () => {},
	};
};

/**
 * Creates a storage that fails only on specific operations
 */
export const createPartiallyFailingStorage = (
	failOnSave = false,
	failOnLoad = false,
	failOnRemove = false,
	errorMessage = "Operation failed"
): AutoSaveStorage => {
	const mockStorage = new MockAutoSaveStorage();

	return {
		save: failOnSave 
			? async () => { throw new Error(errorMessage); }
			: mockStorage.save.bind(mockStorage),
		load: failOnLoad 
			? async () => { throw new Error(errorMessage); }
			: mockStorage.load.bind(mockStorage),
		remove: failOnRemove 
			? async () => { throw new Error(errorMessage); }
			: mockStorage.remove.bind(mockStorage),
	};
};