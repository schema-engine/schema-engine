/**
 * Type utilities for FormEngineBuilder
 *
 * These utilities help avoid complex intersection types that cause TypeScript to give up.
 */

/**
 * Simplified type that expands object types to make them more readable.
 * This helps TypeScript understand complex types better.
 */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Merge two types using mapped types instead of intersection.
 * This creates a cleaner type that TypeScript can handle better in long chains.
 *
 * Properties from U override properties from T (allowing component override).
 *
 * @example
 * ```typescript
 * type A = { a: string; b: number };
 * type B = { b: string; c: boolean };
 * type C = Merge<A, B>; // { a: string; b: string; c: boolean }
 * ```
 */
export type Merge<T, U> = Simplify<{
	[K in keyof T | keyof U]: K extends keyof U ? U[K] : K extends keyof T ? T[K] : never;
}>;
