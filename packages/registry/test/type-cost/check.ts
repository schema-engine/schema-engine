import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The most instantiations the type-check of `fixture.ts` may take.
 *
 * @remarks
 * The fixture holds 60 registrations that accept each other in a cycle, accept themselves and nest slots two keys deep.
 * It measured about 61,800 instantiations and a check time of 0.15 s when the budget was set. A regression is fixed at
 * its cause, in the types of `tree-types.ts` and `parse-tree.ts`, not by raising this number.
 *
 * The count is the checker's own, not a time, so it is the same on every machine and every run. It depends on the
 * TypeScript and Zod versions of the lockfile: an upgrade of either that moves it is measured on the commit before the
 * upgrade and after it, and the budget follows that difference alone.
 */
const BUDGET = 70_000;

const tsc = fileURLToPath(import.meta.resolve('typescript/lib/tsc.js'));
const project = fileURLToPath(new URL('./tsconfig.json', import.meta.url));

let output = '';
try {
	output = execFileSync(process.execPath, [tsc, '-p', project, '--extendedDiagnostics'], { encoding: 'utf8' });
} catch (error) {
	const failure = error as { stdout?: string };
	process.stderr.write(`${failure.stdout ?? String(error)}\nThe type-cost fixture does not compile.\n`);
	process.exit(1);
}

const instantiations = Number(/^Instantiations:\s+(\d+)/m.exec(output)?.[1]);
if (!Number.isFinite(instantiations)) {
	process.stderr.write(`${output}\nCould not read the instantiation count from the tsc output.\n`);
	process.exit(1);
}
if (instantiations > BUDGET) {
	process.stderr.write(
		`The type-cost fixture took ${instantiations} instantiations, over the budget of ${BUDGET}. Fix the types that got more expensive.\n`,
	);
	process.exit(1);
}
process.stdout.write(`type cost: ${instantiations} instantiations (budget ${BUDGET})\n`);
