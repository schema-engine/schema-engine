import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const elementsFolder = join(import.meta.dirname, '../../../packages/forms/src/elements');

/** The `$type` of each element contract of `@schema-engine/forms/elements`, by the name of its constant. */
export function contractTypes(): Map<string, string> {
	const sources = readdirSync(elementsFolder)
		.filter((file) => file.endsWith('.ts'))
		.map((file) => readFileSync(join(elementsFolder, file), 'utf8'));
	return new Map(
		sources.flatMap((source) =>
			[...source.matchAll(/export const (\w+Contract) = define\w+Contract\(\{\s*\$type: '([^']+)'/g)].map(
				(match) => [match[1]!, match[2]!] as const,
			),
		),
	);
}

/**
 * The `$type` a registration file of the registry declares: its own, or the one of the contract it spreads.
 *
 * @param registration - The source of the `*.registration.ts` file
 */
export function registrationType(registration: string): string | undefined {
	const own = /\$type: '([^']+)'/.exec(registration);
	if (own) return own[1];
	const contract = /\.\.\.(\w+Contract)\b/.exec(registration);
	return contract ? contractTypes().get(contract[1]!) : undefined;
}
