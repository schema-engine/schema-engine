/**
 * 60 registrations that accept each other in a cycle (`n59` accepts `n0`), accept themselves and nest slots two keys
 * deep, parsed with and without `accepts`. `check.ts` type-checks it alone and fails above its instantiation budget.
 */
import * as z from 'zod/mini';
import { createRegistry, safeParseTree } from '../../src';
const reg = createRegistry('Perf', [
	{
		$type: 'n0',
		schema: z.object({
			$type: z.literal('n0'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N0' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n1', 'n7'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n0'] },
		],
	},
	{
		$type: 'n1',
		schema: z.object({
			$type: z.literal('n1'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N1' },
		childPaths: [{ keys: ['kids'], accepts: ['n2'] }],
	},
	{
		$type: 'n2',
		schema: z.object({
			$type: z.literal('n2'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N2' },
		childPaths: [{ keys: ['kids'], accepts: ['n3'] }],
	},
	{
		$type: 'n3',
		schema: z.object({
			$type: z.literal('n3'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N3' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n4', 'n10'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n3'] },
		],
	},
	{
		$type: 'n4',
		schema: z.object({
			$type: z.literal('n4'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N4' },
		childPaths: [{ keys: ['kids'], accepts: ['n5'] }],
	},
	{
		$type: 'n5',
		schema: z.object({
			$type: z.literal('n5'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N5' },
		childPaths: [{ keys: ['kids'], accepts: ['n6'] }],
	},
	{
		$type: 'n6',
		schema: z.object({
			$type: z.literal('n6'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N6' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n7', 'n13'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n6'] },
		],
	},
	{
		$type: 'n7',
		schema: z.object({
			$type: z.literal('n7'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N7' },
		childPaths: [{ keys: ['kids'], accepts: ['n8'] }],
	},
	{
		$type: 'n8',
		schema: z.object({
			$type: z.literal('n8'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N8' },
		childPaths: [{ keys: ['kids'], accepts: ['n9'] }],
	},
	{
		$type: 'n9',
		schema: z.object({
			$type: z.literal('n9'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N9' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n10', 'n16'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n9'] },
		],
	},
	{
		$type: 'n10',
		schema: z.object({
			$type: z.literal('n10'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N10' },
		childPaths: [{ keys: ['kids'], accepts: ['n11'] }],
	},
	{
		$type: 'n11',
		schema: z.object({
			$type: z.literal('n11'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N11' },
		childPaths: [{ keys: ['kids'], accepts: ['n12'] }],
	},
	{
		$type: 'n12',
		schema: z.object({
			$type: z.literal('n12'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N12' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n13', 'n19'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n12'] },
		],
	},
	{
		$type: 'n13',
		schema: z.object({
			$type: z.literal('n13'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N13' },
		childPaths: [{ keys: ['kids'], accepts: ['n14'] }],
	},
	{
		$type: 'n14',
		schema: z.object({
			$type: z.literal('n14'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N14' },
		childPaths: [{ keys: ['kids'], accepts: ['n15'] }],
	},
	{
		$type: 'n15',
		schema: z.object({
			$type: z.literal('n15'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N15' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n16', 'n22'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n15'] },
		],
	},
	{
		$type: 'n16',
		schema: z.object({
			$type: z.literal('n16'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N16' },
		childPaths: [{ keys: ['kids'], accepts: ['n17'] }],
	},
	{
		$type: 'n17',
		schema: z.object({
			$type: z.literal('n17'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N17' },
		childPaths: [{ keys: ['kids'], accepts: ['n18'] }],
	},
	{
		$type: 'n18',
		schema: z.object({
			$type: z.literal('n18'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N18' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n19', 'n25'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n18'] },
		],
	},
	{
		$type: 'n19',
		schema: z.object({
			$type: z.literal('n19'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N19' },
		childPaths: [{ keys: ['kids'], accepts: ['n20'] }],
	},
	{
		$type: 'n20',
		schema: z.object({
			$type: z.literal('n20'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N20' },
		childPaths: [{ keys: ['kids'], accepts: ['n21'] }],
	},
	{
		$type: 'n21',
		schema: z.object({
			$type: z.literal('n21'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N21' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n22', 'n28'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n21'] },
		],
	},
	{
		$type: 'n22',
		schema: z.object({
			$type: z.literal('n22'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N22' },
		childPaths: [{ keys: ['kids'], accepts: ['n23'] }],
	},
	{
		$type: 'n23',
		schema: z.object({
			$type: z.literal('n23'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N23' },
		childPaths: [{ keys: ['kids'], accepts: ['n24'] }],
	},
	{
		$type: 'n24',
		schema: z.object({
			$type: z.literal('n24'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N24' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n25', 'n31'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n24'] },
		],
	},
	{
		$type: 'n25',
		schema: z.object({
			$type: z.literal('n25'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N25' },
		childPaths: [{ keys: ['kids'], accepts: ['n26'] }],
	},
	{
		$type: 'n26',
		schema: z.object({
			$type: z.literal('n26'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N26' },
		childPaths: [{ keys: ['kids'], accepts: ['n27'] }],
	},
	{
		$type: 'n27',
		schema: z.object({
			$type: z.literal('n27'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N27' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n28', 'n34'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n27'] },
		],
	},
	{
		$type: 'n28',
		schema: z.object({
			$type: z.literal('n28'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N28' },
		childPaths: [{ keys: ['kids'], accepts: ['n29'] }],
	},
	{
		$type: 'n29',
		schema: z.object({
			$type: z.literal('n29'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N29' },
		childPaths: [{ keys: ['kids'], accepts: ['n30'] }],
	},
	{
		$type: 'n30',
		schema: z.object({
			$type: z.literal('n30'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N30' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n31', 'n37'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n30'] },
		],
	},
	{
		$type: 'n31',
		schema: z.object({
			$type: z.literal('n31'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N31' },
		childPaths: [{ keys: ['kids'], accepts: ['n32'] }],
	},
	{
		$type: 'n32',
		schema: z.object({
			$type: z.literal('n32'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N32' },
		childPaths: [{ keys: ['kids'], accepts: ['n33'] }],
	},
	{
		$type: 'n33',
		schema: z.object({
			$type: z.literal('n33'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N33' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n34', 'n40'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n33'] },
		],
	},
	{
		$type: 'n34',
		schema: z.object({
			$type: z.literal('n34'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N34' },
		childPaths: [{ keys: ['kids'], accepts: ['n35'] }],
	},
	{
		$type: 'n35',
		schema: z.object({
			$type: z.literal('n35'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N35' },
		childPaths: [{ keys: ['kids'], accepts: ['n36'] }],
	},
	{
		$type: 'n36',
		schema: z.object({
			$type: z.literal('n36'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N36' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n37', 'n43'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n36'] },
		],
	},
	{
		$type: 'n37',
		schema: z.object({
			$type: z.literal('n37'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N37' },
		childPaths: [{ keys: ['kids'], accepts: ['n38'] }],
	},
	{
		$type: 'n38',
		schema: z.object({
			$type: z.literal('n38'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N38' },
		childPaths: [{ keys: ['kids'], accepts: ['n39'] }],
	},
	{
		$type: 'n39',
		schema: z.object({
			$type: z.literal('n39'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N39' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n40', 'n46'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n39'] },
		],
	},
	{
		$type: 'n40',
		schema: z.object({
			$type: z.literal('n40'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N40' },
		childPaths: [{ keys: ['kids'], accepts: ['n41'] }],
	},
	{
		$type: 'n41',
		schema: z.object({
			$type: z.literal('n41'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N41' },
		childPaths: [{ keys: ['kids'], accepts: ['n42'] }],
	},
	{
		$type: 'n42',
		schema: z.object({
			$type: z.literal('n42'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N42' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n43', 'n49'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n42'] },
		],
	},
	{
		$type: 'n43',
		schema: z.object({
			$type: z.literal('n43'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N43' },
		childPaths: [{ keys: ['kids'], accepts: ['n44'] }],
	},
	{
		$type: 'n44',
		schema: z.object({
			$type: z.literal('n44'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N44' },
		childPaths: [{ keys: ['kids'], accepts: ['n45'] }],
	},
	{
		$type: 'n45',
		schema: z.object({
			$type: z.literal('n45'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N45' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n46', 'n52'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n45'] },
		],
	},
	{
		$type: 'n46',
		schema: z.object({
			$type: z.literal('n46'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N46' },
		childPaths: [{ keys: ['kids'], accepts: ['n47'] }],
	},
	{
		$type: 'n47',
		schema: z.object({
			$type: z.literal('n47'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N47' },
		childPaths: [{ keys: ['kids'], accepts: ['n48'] }],
	},
	{
		$type: 'n48',
		schema: z.object({
			$type: z.literal('n48'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N48' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n49', 'n55'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n48'] },
		],
	},
	{
		$type: 'n49',
		schema: z.object({
			$type: z.literal('n49'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N49' },
		childPaths: [{ keys: ['kids'], accepts: ['n50'] }],
	},
	{
		$type: 'n50',
		schema: z.object({
			$type: z.literal('n50'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N50' },
		childPaths: [{ keys: ['kids'], accepts: ['n51'] }],
	},
	{
		$type: 'n51',
		schema: z.object({
			$type: z.literal('n51'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N51' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n52', 'n58'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n51'] },
		],
	},
	{
		$type: 'n52',
		schema: z.object({
			$type: z.literal('n52'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N52' },
		childPaths: [{ keys: ['kids'], accepts: ['n53'] }],
	},
	{
		$type: 'n53',
		schema: z.object({
			$type: z.literal('n53'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N53' },
		childPaths: [{ keys: ['kids'], accepts: ['n54'] }],
	},
	{
		$type: 'n54',
		schema: z.object({
			$type: z.literal('n54'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N54' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n55', 'n1'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n54'] },
		],
	},
	{
		$type: 'n55',
		schema: z.object({
			$type: z.literal('n55'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N55' },
		childPaths: [{ keys: ['kids'], accepts: ['n56'] }],
	},
	{
		$type: 'n56',
		schema: z.object({
			$type: z.literal('n56'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N56' },
		childPaths: [{ keys: ['kids'], accepts: ['n57'] }],
	},
	{
		$type: 'n57',
		schema: z.object({
			$type: z.literal('n57'),
			label: z.string(),
			kids: z.optional(z.array(z.unknown())),
			slot: z.optional(z.object({ one: z.unknown(), many: z.array(z.unknown()) })),
		}),
		metadata: { name: 'N57' },
		childPaths: [
			{ keys: ['kids'], accepts: ['n58', 'n4'] },
			{ keys: ['slot', 'one'] },
			{ keys: ['slot', 'many'], accepts: ['n57'] },
		],
	},
	{
		$type: 'n58',
		schema: z.object({
			$type: z.literal('n58'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N58' },
		childPaths: [{ keys: ['kids'], accepts: ['n59'] }],
	},
	{
		$type: 'n59',
		schema: z.object({
			$type: z.literal('n59'),
			value: z._default(z.number(), 0),
			kids: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'N59' },
		childPaths: [{ keys: ['kids'], accepts: ['n0'] }],
	},
]);
const r = safeParseTree(reg, {}, { accepts: ['n0'] });
if (r.success) {
	const d = r.tree.data;
	const x: number = d.kids?.[0]?.$type === 'n1' ? (d.kids[0].kids?.[0]?.value ?? 0) : 0;
	void x;
	const s = d.slot?.one;
	void s;
	for (const g of r.tree.children) void g.nodes;
}
const any = safeParseTree(reg, {});
if (any.success) void any.tree.data;
