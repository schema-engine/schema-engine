import { GET } from './server';

/**
 * Sends every `fetch` of the example to the route handler of `server.ts`, so the example runs without a network.
 *
 * @remarks
 * Do not call it to talk to a real server.
 */
export function useLocalServer(): void {
	globalThis.fetch = async (input, init) => GET(new Request(input, init));
}
