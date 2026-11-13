import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GITHUB = 'andeeplus/schema-engine';

const SHARED_FORMS_ROOT = 'registry/shared/forms';
const SHARED_PRIMITIVES_ROOT = 'registry/shared/primitives';

type BaseId = 'base-ui' | 'radix' | 'aria';
type PrimitiveName =
	'field' | 'combobox' | 'phone-input' | 'drop-zone' | 'masked-input' | 'number-field' | 'date-picker';
type ItemType = 'registry:lib' | 'registry:ui' | 'registry:item' | 'registry:component' | 'registry:file';

interface CatalogFile {
	path: string;
	type: ItemType;
	target: string;
}

interface Registration {
	ident: string;
	from: string;
}

interface CatalogItem {
	name: string;
	type: ItemType;
	title: string;
	description: string;
	registryDependencies: string[];
	dependencies: string[];
	files: CatalogFile[];
	docs?: string;
	registration?: Registration;
}

/** Per-primitive metadata a base may override when its implementation differs. */
interface PrimitiveOverride {
	dependencies?: string[];
	registryDependencies?: string[];
	description?: string;
}

interface Base {
	id: BaseId;
	/** Appended to every item name so the three catalogs can coexist. */
	suffix: string;
	aggregateName: string;
	label: string;
	primitives?: Partial<Record<PrimitiveName, PrimitiveOverride>>;
}

/** Same-repo item stems. Resolved to `owner/repo/<stem><suffix>` per base. */
const UTILS = 'schema-engine-form-utils';

const PRIMITIVE_ITEM: Record<PrimitiveName, string> = {
	field: 'schema-engine-form-field-primitive',
	combobox: 'schema-engine-form-combobox-primitive',
	'phone-input': 'schema-engine-form-phone-primitive',
	'drop-zone': 'schema-engine-form-dropzone-primitive',
	'masked-input': 'schema-engine-form-masked-input-primitive',
	'number-field': 'schema-engine-form-number-field-primitive',
	'date-picker': 'schema-engine-form-date-picker-primitive',
};

interface PrimitiveSpec {
	title: string;
	description: string;
	registryDependencies: string[];
	dependencies: string[];
}

const PRIMITIVES: Record<PrimitiveName, PrimitiveSpec> = {
	field: {
		title: 'Schema Engine field',
		description: 'Label, description, and error chrome for Schema Engine fields.',
		registryDependencies: ['label'],
		dependencies: ['@schema-engine/forms', '@schema-engine/forms-react', '@schema-engine/layout'],
	},
	combobox: {
		title: 'Schema Engine combobox',
		description: 'Chips-capable combobox primitive used by FormCombobox.',
		registryDependencies: [],
		dependencies: ['lucide-react'],
	},
	'phone-input': {
		title: 'Schema Engine phone input',
		description: 'Schema Engine phone input primitive.',
		registryDependencies: ['button', 'command', 'input', 'popover'],
		dependencies: ['react-phone-number-input', 'lucide-react', 'libphonenumber-js'],
	},
	'drop-zone': {
		title: 'Schema Engine dropzone',
		description: 'Schema Engine dropzone primitive.',
		registryDependencies: ['button'],
		dependencies: ['react-dropzone', 'lucide-react'],
	},
	'masked-input': {
		title: 'Schema Engine masked input',
		description: 'Schema Engine masked input primitive powered by imask.',
		registryDependencies: [],
		dependencies: ['imask'],
	},
	'number-field': {
		title: 'Schema Engine number field',
		description: 'Number field primitive with increment and decrement steppers used by FormNumber.',
		registryDependencies: [],
		dependencies: ['lucide-react'],
	},
	'date-picker': {
		title: 'Schema Engine date picker',
		description: 'Calendar popover primitives for single dates and date ranges used by FormDate and FormDateRange.',
		registryDependencies: ['button', 'calendar', 'popover'],
		dependencies: ['date-fns', 'lucide-react', 'react-day-picker'],
	},
};

/**
 * A base only overrides primitive metadata where it also overrides the source
 * file in `registry/<base>/primitives`; everything else comes from the shared
 * implementation and the `PRIMITIVES` defaults above.
 */
const BASES: Base[] = [
	{
		id: 'base-ui',
		suffix: '',
		aggregateName: 'schema-form',
		label: 'Base UI',
		primitives: {
			combobox: {
				dependencies: ['@base-ui/react', 'lucide-react'],
				description: 'Chips-capable Base UI combobox primitive used by FormCombobox.',
			},
			'number-field': {
				dependencies: ['@base-ui/react', 'lucide-react'],
				description: 'Base UI number field primitive with stepper buttons used by FormNumber.',
			},
		},
	},
	{
		id: 'radix',
		suffix: '-radix',
		aggregateName: 'schema-form-radix',
		label: 'Radix UI',
		primitives: {
			combobox: {
				dependencies: ['cmdk', 'lucide-react'],
				registryDependencies: ['popover', 'command'],
				description: 'Chips-capable Radix combobox primitive (Popover + Command) used by FormCombobox.',
			},
			'number-field': {
				dependencies: ['react-aria-components', 'lucide-react'],
				description: 'React Aria number field primitive with stepper buttons used by FormNumber.',
			},
		},
	},
	{
		id: 'aria',
		suffix: '-aria',
		aggregateName: 'schema-form-aria',
		label: 'React Aria',
		primitives: {
			combobox: {
				dependencies: ['react-aria-components', 'lucide-react'],
				description: 'Chips-capable React Aria combobox primitive used by FormCombobox.',
			},
			'number-field': {
				dependencies: ['react-aria-components', 'lucide-react'],
				description: 'React Aria number field primitive with stepper buttons used by FormNumber.',
			},
			'phone-input': {
				dependencies: [
					'react-phone-number-input',
					'lucide-react',
					'react-aria-components',
					'libphonenumber-js',
				],
			},
			'drop-zone': {
				dependencies: ['react-aria-components', 'lucide-react'],
				description: 'Schema Engine dropzone primitive built on React Aria DropZone.',
			},
		},
	},
];

const FORM_RUNTIME_DEPENDENCIES = [
	'@schema-engine/forms-react',
	'@schema-engine/forms',
	'@schema-engine/layout',
	'zod',
];

const DEFAULT_RECIPE_ITEM = 'schema-engine-form-recipes';
const DEFAULT_RECIPE_RUNTIME_DEPENDENCIES = [...FORM_RUNTIME_DEPENDENCIES, 'lucide-react'];
const DEFAULT_RECIPE_REGISTRY_DEPENDENCIES = ['button', 'badge', 'separator', UTILS];

function listRelativeSourceFiles(absDir: string, prefix = ''): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(absDir, { withFileTypes: true }).toSorted((left, right) =>
		left.name.localeCompare(right.name),
	)) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			files.push(...listRelativeSourceFiles(join(absDir, entry.name), rel));
		} else if (rel.endsWith('.ts') || rel.endsWith('.tsx') || rel.endsWith('.css')) {
			files.push(rel);
		}
	}
	return files;
}

function defaultRecipeFiles(): string[] {
	return listRelativeSourceFiles(join(root, SHARED_FORMS_ROOT, 'recipes'));
}

/**
 * Every form element ships the same triple of files and a registration, so the
 * catalog only records what actually varies between them.
 */
interface ElementSpec {
	/** Path stem under the forms root, e.g. `inputs/form-input`. */
	stem: string;
	title: string;
	/** Exported registration identifier. */
	ident: string;
	/** Item name stem. Defaults to `schema-engine-form-<slug>`. */
	name?: string;
	/** Defaults to `Schema Engine <slug> form element.` */
	description?: string;
	registryDependencies?: string[];
	/** npm deps beyond `FORM_RUNTIME_DEPENDENCIES`. */
	dependencies?: string[];
}

const ELEMENTS: ElementSpec[] = [
	{
		stem: 'content/form-submission-alert',
		title: 'Submission alert',
		ident: 'SubmissionAlertElementRegistration',
		registryDependencies: ['alert'],
		dependencies: ['lucide-react'],
	},
	{
		stem: 'actions/submit-button',
		title: 'Submit button',
		ident: 'SubmitButtonElementRegistration',
		registryDependencies: ['button'],
	},
	{
		stem: 'inputs/form-fieldset',
		title: 'Fieldset',
		ident: 'FieldSetRegistration',
		registryDependencies: [PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-array-elements',
		title: 'Array elements',
		ident: 'ArrayElementRegistration',
		registryDependencies: ['button', UTILS, PRIMITIVE_ITEM.field],
		dependencies: ['lucide-react'],
	},
	{
		stem: 'inputs/form-phone-input',
		title: 'Phone input',
		ident: 'PhoneInputElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['phone-input'], PRIMITIVE_ITEM.field],
		dependencies: ['react-phone-number-input', 'libphonenumber-js'],
	},
	{
		stem: 'inputs/form-masked-input',
		title: 'Masked input',
		description: 'Schema Engine masked-input form element for IBAN, cards, and other patterned values.',
		ident: 'MaskedInputElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['masked-input'], PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-textarea',
		title: 'Textarea',
		ident: 'TextareaElementRegistration',
		registryDependencies: ['textarea', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-checkbox',
		title: 'Checkbox',
		ident: 'CheckboxElementRegistration',
		registryDependencies: ['checkbox', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-input-otp',
		title: 'Input OTP',
		ident: 'InputOTPElementRegistration',
		registryDependencies: ['input-otp', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-drop-zone',
		title: 'Drop zone',
		ident: 'DropZoneElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['drop-zone'], PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-checkbox-group',
		title: 'Checkbox group',
		ident: 'CheckboxGroupElementRegistration',
		registryDependencies: ['label', 'checkbox', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-number',
		title: 'Number',
		ident: 'NumberElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['number-field'], PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-switch',
		title: 'Switch',
		ident: 'SwitchElementRegistration',
		registryDependencies: ['switch', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-select',
		title: 'Select',
		description: 'Schema Engine select form element. Supports multiple selection with chips.',
		ident: 'SelectElementRegistration',
		registryDependencies: ['select', PRIMITIVE_ITEM.field],
		dependencies: ['lucide-react'],
	},
	{
		stem: 'inputs/form-radio',
		title: 'Radio',
		ident: 'RadioElementRegistration',
		registryDependencies: ['label', 'radio-group', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-combobox',
		title: 'Combobox',
		description: 'Schema Engine combobox form element. Use multiple for chips-based multi-select.',
		ident: 'ComboboxElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM.combobox, PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-slider',
		title: 'Slider',
		ident: 'SliderElementRegistration',
		registryDependencies: ['slider', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-input',
		title: 'Input',
		ident: 'InputElementRegistration',
		registryDependencies: ['input', PRIMITIVE_ITEM.field],
	},
	{
		stem: 'inputs/form-date',
		title: 'Date',
		ident: 'DateElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['date-picker'], PRIMITIVE_ITEM.field],
		dependencies: ['date-fns', 'react-day-picker'],
	},
	{
		stem: 'inputs/form-date-range',
		title: 'Date range',
		ident: 'DateRangeElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['date-picker'], PRIMITIVE_ITEM.field],
		dependencies: ['date-fns', 'react-day-picker'],
	},
];

function itemName(base: Base, stem: string): string {
	return stem + base.suffix;
}

/** Rewrites same-repo item stems into their addressable GitHub form. */
function resolveDep(base: Base, dep: string): string {
	const isSameRepo = dep.startsWith('schema-engine-form-') || dep.startsWith('schema-form');
	return isSameRepo ? `${GITHUB}/${itemName(base, dep)}` : dep;
}

/**
 * Both form wrappers and primitives resolve the same way: a base-specific file
 * wins when it exists, otherwise the shared implementation is used.
 */
function preferOverride(override: string, shared: string): string {
	return existsSync(join(root, override)) ? override : shared;
}

function formFile(base: Base, rel: string): CatalogFile {
	const path = preferOverride(`registry/${base.id}/overlays/forms/${rel}`, `${SHARED_FORMS_ROOT}/${rel}`);

	return {
		path,
		type: rel.endsWith('.tsx') ? 'registry:component' : 'registry:lib',
		target: `@components/schema-engine/forms/${rel}`,
	};
}

function primitiveFile(base: Base, name: PrimitiveName): CatalogFile {
	const rel = `${name}.tsx`;
	const path = preferOverride(`registry/${base.id}/primitives/${rel}`, `${SHARED_PRIMITIVES_ROOT}/${rel}`);

	return { path, type: 'registry:ui', target: `@ui/schema-engine/components/${rel}` };
}

function primitiveFiles(base: Base, name: PrimitiveName): CatalogFile[] {
	const files = [primitiveFile(base, name)];
	if (name === 'phone-input') {
		files.push({
			path: `${SHARED_PRIMITIVES_ROOT}/phone-country.ts`,
			type: 'registry:lib',
			target: '@ui/schema-engine/components/phone-country.ts',
		});
	}
	if (name === 'date-picker') {
		files.push(
			{
				path: `${SHARED_PRIMITIVES_ROOT}/calendar.tsx`,
				type: 'registry:ui',
				target: '@ui/schema-engine/components/calendar.tsx',
			},
			{
				path: `${SHARED_PRIMITIVES_ROOT}/date-input.tsx`,
				type: 'registry:ui',
				target: '@ui/schema-engine/components/date-input.tsx',
			},
			{
				path: `${SHARED_PRIMITIVES_ROOT}/date-picker.tsx`,
				type: 'registry:ui',
				target: '@ui/schema-engine/components/date-picker.tsx',
			},
			{
				path: `${SHARED_PRIMITIVES_ROOT}/date-range-picker.tsx`,
				type: 'registry:ui',
				target: '@ui/schema-engine/components/date-range-picker.tsx',
			},
			{
				path: `${SHARED_PRIMITIVES_ROOT}/date-range-presets.ts`,
				type: 'registry:lib',
				target: '@ui/schema-engine/components/date-range-presets.ts',
			},
			{
				path: `${SHARED_PRIMITIVES_ROOT}/date-utils.ts`,
				type: 'registry:lib',
				target: '@ui/schema-engine/components/date-utils.ts',
			},
		);
	}
	return files;
}

/** `inputs/form-drop-zone` -> `drop-zone` */
function elementSlug(stem: string): string {
	return stem.slice(stem.lastIndexOf('/') + 1).replace(/^form-/, '');
}

function buildPrimitiveItem(base: Base, name: PrimitiveName): CatalogItem {
	const spec = PRIMITIVES[name];
	const override = base.primitives?.[name] ?? {};

	return {
		name: itemName(base, PRIMITIVE_ITEM[name]),
		type: 'registry:ui',
		title: spec.title,
		description: override.description ?? spec.description,
		registryDependencies: (override.registryDependencies ?? spec.registryDependencies).map((dep) =>
			resolveDep(base, dep),
		),
		dependencies: override.dependencies ?? spec.dependencies,
		files: primitiveFiles(base, name),
	};
}

function buildElementItem(base: Base, spec: ElementSpec): CatalogItem {
	const slug = elementSlug(spec.stem);

	return {
		name: itemName(base, spec.name ?? `schema-engine-form-${slug}`),
		type: 'registry:item',
		title: spec.title,
		description: spec.description ?? `Schema Engine ${slug} form element.`,
		registryDependencies: (spec.registryDependencies ?? []).map((dep) => resolveDep(base, dep)),
		dependencies: [...new Set([...(spec.dependencies ?? []), ...FORM_RUNTIME_DEPENDENCIES])],
		files: [
			formFile(base, `${spec.stem}.tsx`),
			formFile(base, `${spec.stem}.types.ts`),
			formFile(base, `${spec.stem}.registration.ts`),
			...(spec.stem === 'inputs/form-phone-input' ? [formFile(base, `${spec.stem}.validation.ts`)] : []),
		],
		registration: { ident: spec.ident, from: `./${spec.stem}.registration` },
	};
}

/**
 * A stylesheet is a `registry:file`, which the shadcn CLI copies to its `target` without touching it.
 *
 * @remarks
 * The app imports the stylesheet from its global stylesheet. No component imports it, because the
 * import needs the app's cascade layer (`layer(components)`) to let utility classes win.
 */
function recipeFileType(rel: string): ItemType {
	if (rel.endsWith('.css')) return 'registry:file';
	return rel.endsWith('.tsx') ? 'registry:component' : 'registry:lib';
}

function recipeFile(rel: string): CatalogFile {
	return {
		path: `${SHARED_FORMS_ROOT}/recipes/${rel}`,
		type: recipeFileType(rel),
		target: `@components/schema-engine/forms/recipes/${rel}`,
	};
}

/**
 * Default recipe implementations are a distinct installation boundary from
 * form elements. Consumers opt into their visual layer with
 * `createFormEngine({ recipes })`.
 */
function buildDefaultRecipeItem(base: Base): CatalogItem {
	return {
		name: itemName(base, DEFAULT_RECIPE_ITEM),
		type: 'registry:item',
		title: `Schema Engine default recipes (${base.label})`,
		description: `Default ${base.label} view recipes and the generated recipe registration barrel.`,
		docs: 'Import schemaFormRecipeRegistrations from @/components/schema-engine/forms/recipes/registrations and pass them to createFormEngine({ recipes: [...] }). Import the recipe styles once in your global stylesheet: @import "./components/schema-engine/forms/recipes/recipes.css" layer(components); (the path is relative to that stylesheet: ../components/... from a Next.js app/globals.css).',
		registryDependencies: DEFAULT_RECIPE_REGISTRY_DEPENDENCIES.map((dep) => resolveDep(base, dep)),
		dependencies: DEFAULT_RECIPE_RUNTIME_DEPENDENCIES,
		files: defaultRecipeFiles().map(recipeFile),
	};
}

function buildItems(base: Base): CatalogItem[] {
	return [
		{
			name: itemName(base, UTILS),
			type: 'registry:lib',
			title: 'Form utils',
			description: 'className helper for Schema Engine form elements.',
			registryDependencies: [],
			dependencies: ['clsx', 'tailwind-merge'],
			files: [formFile(base, 'lib/utils.ts')],
		},
		...(Object.keys(PRIMITIVES) as PrimitiveName[]).map((name) => buildPrimitiveItem(base, name)),
		...ELEMENTS.map((spec) => buildElementItem(base, spec)),
	];
}

function buildAggregate(base: Base, items: CatalogItem[]): CatalogItem {
	return {
		name: base.aggregateName,
		type: 'registry:item',
		title: `Schema Engine forms (${base.label})`,
		description: `All ${base.label} Schema Engine form elements and the generated registration barrel.`,
		docs: 'Import schemaFormRegistrations from @/components/schema-engine/forms/registrations and pass them to createFormEngine({ elements: [...] }).',
		registryDependencies: items.map((item) => `${GITHUB}/${item.name}`),
		dependencies: FORM_RUNTIME_DEPENDENCIES,
		files: [
			formFile(base, 'registrations.ts'),
			formFile(base, 'index.ts'),
			formFile(base, 'inputs/index.ts'),
			formFile(base, 'actions/index.ts'),
			formFile(base, 'content/index.ts'),
		],
	};
}

interface BaseCatalog {
	base: Base;
	items: CatalogItem[];
	catalog: CatalogItem[];
}

const catalogsByBase: BaseCatalog[] = BASES.map((base) => {
	const items = buildItems(base);
	return { base, items, catalog: [...items, buildAggregate(base, items), buildDefaultRecipeItem(base)] };
});

export const catalog: CatalogItem[] = catalogsByBase.flatMap((entry) => entry.catalog);

function collectImports(source: string): string[] {
	return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1] as string);
}

/** Import specifier prefix -> same-repo registry item stem. */
const REGISTRY_DEP_BY_IMPORT: Array<[string, string]> = [
	['@/components/ui/schema-engine/components/field', PRIMITIVE_ITEM.field],
	['@/components/ui/schema-engine/components/phone-input', PRIMITIVE_ITEM['phone-input']],
	['@/components/ui/schema-engine/components/drop-zone', PRIMITIVE_ITEM['drop-zone']],
	['@/components/ui/schema-engine/components/combobox', PRIMITIVE_ITEM.combobox],
	['@/components/ui/schema-engine/components/masked-input', PRIMITIVE_ITEM['masked-input']],
	['@/components/ui/schema-engine/components/number-field', PRIMITIVE_ITEM['number-field']],
	['@/components/schema-engine/forms/lib/utils', UTILS],
];

/** Bare npm specifiers that must be declared when imported. */
const TRACKED_NPM_DEPENDENCIES = [
	'@schema-engine/forms-react',
	'@schema-engine/forms',
	'@schema-engine/layout',
	'zod',
	'clsx',
	'tailwind-merge',
	'lucide-react',
	'@base-ui/react',
	'cmdk',
	'react-aria-components',
	'react-phone-number-input',
	'react-dropzone',
	'imask',
];

const PUBLIC_FORMS_REACT_IMPORTS = new Set([
	'@schema-engine/forms-react',
	'@schema-engine/forms-react/adapters',
	'@schema-engine/forms-react/adapters/react-hook-form',
	'@schema-engine/forms-react/contexts',
	'@schema-engine/forms-react/hooks',
	'@schema-engine/forms-react/primitives',
]);

function expectedFromImports(imports: string[], base: Base) {
	const registryDependencies = new Set<string>();
	const dependencies = new Set<string>();

	for (const spec of imports) {
		const sameRepo = REGISTRY_DEP_BY_IMPORT.find(([prefix]) => spec.startsWith(prefix));
		if (sameRepo) {
			registryDependencies.add(resolveDep(base, sameRepo[1]));
			continue;
		}

		if (spec.startsWith('@/components/ui/')) {
			const rest = spec.slice('@/components/ui/'.length);
			if (!rest.startsWith('schema-engine/')) {
				registryDependencies.add(rest.split('/')[0] as string);
			}
			continue;
		}

		const npm = TRACKED_NPM_DEPENDENCIES.find((dep) => spec === dep || spec.startsWith(`${dep}/`));
		if (npm) dependencies.add(npm);
	}

	return { registryDependencies, dependencies };
}

/** Override dirs whose files must genuinely differ from the shared original. */
const OVERRIDE_ROOTS: Array<{ overrideDir: (base: Base) => string; sharedDir: string }> = [
	{ overrideDir: (base) => `registry/${base.id}/overlays/forms`, sharedDir: SHARED_FORMS_ROOT },
	{ overrideDir: (base) => `registry/${base.id}/primitives`, sharedDir: SHARED_PRIMITIVES_ROOT },
];

function checkOverrideIsNotACopy(base: Base, file: CatalogFile, errors: string[]): void {
	for (const { overrideDir, sharedDir } of OVERRIDE_ROOTS) {
		const prefix = `${overrideDir(base)}/`;
		if (!file.path.startsWith(prefix)) continue;

		const sharedPath = join(root, sharedDir, file.path.slice(prefix.length));
		if (!existsSync(sharedPath)) return;

		if (readFileSync(join(root, file.path), 'utf8') === readFileSync(sharedPath, 'utf8')) {
			errors.push(`${file.path} is identical to the shared original; delete the override`);
		}
	}
}

export function validateCatalog(): string[] {
	const errors: string[] = [];
	const names = new Set<string>();

	for (const { base, items, catalog: baseCatalog } of catalogsByBase) {
		for (const item of baseCatalog) {
			if (names.has(item.name)) errors.push(`duplicate item name: ${item.name}`);
			names.add(item.name);

			for (const file of item.files) {
				if (!existsSync(join(root, file.path))) {
					errors.push(`${item.name} missing file ${file.path}`);
					continue;
				}
				if (!file.target.startsWith('@components/') && !file.target.startsWith('@ui/')) {
					errors.push(`${item.name} file ${file.path} target must use @components/ or @ui/`);
				}
				checkOverrideIsNotACopy(base, file, errors);
			}

			if (item.name === base.aggregateName) continue;

			const imports = item.files
				.filter((file) => existsSync(join(root, file.path)))
				.flatMap((file) => collectImports(readFileSync(join(root, file.path), 'utf8')));

			for (const spec of imports) {
				if (spec.includes('@schema-engine/forms-react/components/internals')) {
					errors.push(`${item.name} reaches into forms-react internals: ${spec}`);
				}
				if (spec.startsWith('@schema-engine/forms-react') && !PUBLIC_FORMS_REACT_IMPORTS.has(spec)) {
					errors.push(`${item.name} uses a non-public forms-react import: ${spec}`);
				}
			}

			const expected = expectedFromImports(imports, base);
			for (const dep of expected.registryDependencies) {
				if (!item.registryDependencies.includes(dep)) {
					errors.push(`${item.name} missing registryDependency ${dep}`);
				}
			}
			for (const dep of expected.dependencies) {
				if (!item.dependencies.includes(dep)) {
					errors.push(`${item.name} missing npm dependency ${dep}`);
				}
			}
		}

		const aggregate = baseCatalog.find((item) => item.name === base.aggregateName);
		if (!aggregate) {
			errors.push(`${base.id} is missing its ${base.aggregateName} aggregate item`);
			continue;
		}

		const owned = new Set(items.flatMap((item) => item.files.map((file) => file.path)));
		for (const file of aggregate.files) {
			if (owned.has(file.path) && !file.path.endsWith('registrations.ts') && !file.path.endsWith('index.ts')) {
				errors.push(`${base.aggregateName} should not re-ship ${file.path}`);
			}
		}
	}

	return errors;
}

function elementRegistrations(): Registration[] {
	const [primary] = catalogsByBase;
	if (!primary) return [];

	return primary.items
		.filter((item): item is CatalogItem & { registration: Registration } => Boolean(item.registration))
		.map((item) => item.registration);
}

function renderRegistrations(registrations: Registration[]): string {
	const imports = registrations.map((entry) => `import { ${entry.ident} } from '${entry.from}';`).join('\n');
	const idents = registrations.map((entry) => entry.ident);

	return `/**
 * Generated registration barrel for the aggregate \`schema-form\` item.
 * Consumers can import this once to install every Schema Engine form element.
 */
${imports}

export {
	${idents.join(',\n\t')},
};

export const schemaFormRegistrations = [
	${idents.join(',\n\t')},
] as const;
`;
}

function compareRecipeStems(left: string, right: string) {
	if (left === right) return 0;
	if (left.startsWith(`${right}-`)) return 1;
	if (right.startsWith(`${left}-`)) return -1;
	return left.localeCompare(right);
}

function recipeTitle(stem: string): string {
	return stem
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/** Resolves a relative import inside the recipes tree, or null for package imports. */
function resolveRecipeLocalImport(fromFile: string, spec: string): string | null {
	if (!spec.startsWith('.')) return null;
	const base = join(root, SHARED_FORMS_ROOT, 'recipes', dirname(fromFile), spec);
	for (const ext of ['.tsx', '.ts']) {
		const candidate = `${relative(join(root, SHARED_FORMS_ROOT, 'recipes'), base)}${ext}`;
		if (existsSync(join(root, SHARED_FORMS_ROOT, 'recipes', candidate))) return candidate;
	}
	return null;
}

/** Collects the registration plus every local implementation file it references. */
function recipeSourceFiles(rel: string, source: string): string[] {
	const files = [rel];
	const seen = new Set([rel]);

	for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
		const local = resolveRecipeLocalImport(rel, match[1] as string);
		if (!local || seen.has(local)) continue;
		seen.add(local);
		files.push(local);
		const stylesheet = local.replace(/\.tsx?$/, '.css');
		if (!seen.has(stylesheet) && existsSync(join(root, SHARED_FORMS_ROOT, 'recipes', stylesheet))) {
			seen.add(stylesheet);
			files.push(stylesheet);
		}
	}

	return files;
}

interface RecipeScanEntry extends Registration {
	stem: string;
	source: string;
}

function scanRecipeRegistrations(): RecipeScanEntry[] {
	const dir = join(root, SHARED_FORMS_ROOT, 'recipes/registrations');
	return readdirSync(dir)
		.filter((name) => name.endsWith('.ts'))
		.map((name) => name.replace(/\.ts$/, ''))
		.toSorted(compareRecipeStems)
		.map((stem) => {
			const source = readFileSync(join(dir, `${stem}.ts`), 'utf8');
			const match = source.match(/export const (\w+)/);
			if (!match?.[1]) {
				throw new Error(`Missing exported recipe identifier in recipes/registrations/${stem}.ts`);
			}
			return { stem, source, ident: match[1], from: `./registrations/${stem}` };
		});
}

function renderRecipeRegistrations(scan: RecipeScanEntry[]): string {
	const imports = scan.map((entry) => `import { ${entry.ident} } from '${entry.from}';`).join('\n');
	const idents = scan.map((entry) => entry.ident);

	return `/**
 * Generated registration barrel for the default recipe registry item.
 * Consumers explicitly opt into this visual layer with createFormEngine({ recipes: [...] }).
 */
${imports}

export {
	${idents.join(',\n\t')},
};

export const schemaFormRecipeRegistrations = [
	${idents.join(',\n\t')},
] as const;
`;
}

interface RecipeManifest {
	recipes: Array<{ id: string; title: string; files: string[] }>;
}

/**
 * Maps each recipe to the files a consumer needs to copy it into an
 * application. The docs site renders from this instead of re-parsing sources.
 */
function renderRecipeManifest(scan: RecipeScanEntry[]): string {
	const manifest: RecipeManifest = {
		recipes: scan.map(({ stem, source }) => {
			const files = recipeSourceFiles(`registrations/${stem}.ts`, source);
			return {
				id: stem,
				title: recipeTitle(stem),
				files: files.some((file) => file.endsWith('.css')) ? [...files, RECIPE_STYLESHEET_ENTRY] : files,
			};
		}),
	};

	return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** The stylesheet the app imports; it pulls in every shell stylesheet. */
const RECIPE_STYLESHEET_ENTRY = 'recipes.css';

/** Shell stylesheets, paired with the shell components beside them. */
function recipeShellStylesheets(): string[] {
	return listRelativeSourceFiles(join(root, SHARED_FORMS_ROOT, 'recipes')).filter(
		(file) => file.endsWith('.css') && file !== RECIPE_STYLESHEET_ENTRY,
	);
}

function renderRecipeStylesheet(stylesheets: string[]): string {
	return `/*
 * Generated entry point for the Schema Engine default recipe styles.
 * Import this one file from the app's global stylesheet; each shell's file sits beside its component.
 */
${stylesheets.map((file) => `@import './${file}';`).join('\n')}
`;
}

function toRegistryItem(item: CatalogItem) {
	const { registration: _registration, ...rest } = item;
	return rest;
}

function buildRootRegistry() {
	return {
		$schema: 'https://ui.shadcn.com/schema/registry.json',
		name: 'schema-engine',
		homepage: `https://github.com/${GITHUB}`,
		items: catalog.map(toRegistryItem),
	};
}

/**
 * Every generated artifact, keyed by repo-relative path. `generate` writes this
 * map and `--check` compares against it, so the two can never disagree.
 */
export function buildOutputs(): Map<string, string> {
	const outputs = new Map<string, string>();

	const recipeScan = scanRecipeRegistrations();

	outputs.set('registry.json', `${JSON.stringify(buildRootRegistry(), null, 2)}\n`);
	outputs.set(`${SHARED_FORMS_ROOT}/registrations.ts`, renderRegistrations(elementRegistrations()));
	outputs.set(`${SHARED_FORMS_ROOT}/recipes/registrations.ts`, renderRecipeRegistrations(recipeScan));
	outputs.set(`${SHARED_FORMS_ROOT}/recipes/manifest.json`, renderRecipeManifest(recipeScan));
	outputs.set(
		`${SHARED_FORMS_ROOT}/recipes/${RECIPE_STYLESHEET_ENTRY}`,
		renderRecipeStylesheet(recipeShellStylesheets()),
	);

	return outputs;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
	const errors = validateCatalog();
	if (errors.length > 0) {
		console.error(`Registry catalog is invalid:\n- ${errors.join('\n- ')}`);
		process.exit(1);
	}

	const outputs = buildOutputs();

	if (process.argv.includes('--check')) {
		const stale = [...outputs].filter(([rel, contents]) => {
			const abs = join(root, rel);
			return !existsSync(abs) || readFileSync(abs, 'utf8') !== contents;
		});

		if (stale.length > 0) {
			console.error(
				`Stale generated files. Run pnpm run registry:generate\n- ${stale.map(([rel]) => rel).join('\n- ')}`,
			);
			process.exit(1);
		}

		console.log(`registry catalog ok (${catalog.length} items, ${outputs.size} generated files)`);
	} else {
		for (const [rel, contents] of outputs) {
			const abs = join(root, rel);
			mkdirSync(dirname(abs), { recursive: true });
			writeFileSync(abs, contents);
		}

		console.log(`wrote ${outputs.size} generated files (${catalog.length} catalog items)`);
	}
}
