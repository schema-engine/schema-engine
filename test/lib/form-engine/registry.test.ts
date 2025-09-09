import { test, expect, describe, beforeEach } from 'bun:test';
import { defaultFormRegistry } from '@/lib/form-engine/registry';
import type { FormComponentDefinition } from '@/lib/form-engine';

describe('Registry', () => {
	beforeEach(() => {
		defaultFormRegistry.clear();
	});
	describe('register', () => {
		test('should register a component definition', () => {
			const mockDef: FormComponentDefinition = { name: 'text', component: () => null, category: 'custom' };
			defaultFormRegistry.register(mockDef);
			expect(defaultFormRegistry.get('text')).toBe(mockDef);
		});
		test('should overwrite existing component definition', () => {
			const def1: FormComponentDefinition = { name: 'text', component: () => 'component1', category: 'custom' };
			const def2: FormComponentDefinition = { name: 'text', component: () => 'component2', category: 'custom' };
			defaultFormRegistry.register(def1);
			defaultFormRegistry.register(def2);
			expect(defaultFormRegistry.get('text')).toBe(def2);
		});
		test('should register multiple component definitions', () => {
			const textDef: FormComponentDefinition = { name: 'text', component: () => 'text', category: 'custom' };
			const emailDef: FormComponentDefinition = { name: 'email', component: () => 'email', category: 'custom' };
			defaultFormRegistry.register(textDef);
			defaultFormRegistry.register(emailDef);
			expect(defaultFormRegistry.get('text')).toBe(textDef);
			expect(defaultFormRegistry.get('email')).toBe(emailDef);
		});
	});
	describe('get', () => {
		test('should return registered component definition', () => {
			const mockDef: FormComponentDefinition = { name: 'test', component: () => 'mock', category: 'custom' };
			defaultFormRegistry.register(mockDef);
			expect(defaultFormRegistry.get('test')).toBe(mockDef);
		});
		test('should return undefined for unregistered component', () => {
			expect(defaultFormRegistry.get('nonexistent')).toBeUndefined();
		});
	});
	describe('getAll', () => {
		test('should return all registered component definitions', () => {
			const def1: FormComponentDefinition = { name: 'type1', component: () => '1', category: 'custom' };
			const def2: FormComponentDefinition = { name: 'type2', component: () => '2', category: 'custom' };
			defaultFormRegistry.register(def1);
			defaultFormRegistry.register(def2);
			const all = defaultFormRegistry.getAll();
			expect(all.get('type1')).toBe(def1);
			expect(all.get('type2')).toBe(def2);
		});
		test('should return empty map when no components registered', () => {
			expect(defaultFormRegistry.getAll().size).toBe(0);
		});
	});
	describe('defaultFormRegistry', () => {
		test('should clear all components', () => {
			const def: FormComponentDefinition = { name: 'test', component: () => 'mock', category: 'custom' };
			defaultFormRegistry.register(def);
			expect(defaultFormRegistry.get('test')).toBe(def);
			defaultFormRegistry.clear();
			expect(defaultFormRegistry.get('test')).toBeUndefined();
		});
		test('should get component names', () => {
			expect(defaultFormRegistry.getComponentNames()).toEqual([]);
			defaultFormRegistry.register({ name: 'test1', component: () => '1', category: 'custom' });
			defaultFormRegistry.register({ name: 'test2', component: () => '2', category: 'custom' });
			expect(defaultFormRegistry.getComponentNames().sort()).toEqual(['test1', 'test2']);
		});
	});
});
