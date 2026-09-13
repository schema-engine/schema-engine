import { compile } from '@mdx-js/mdx';
import { readFile } from 'node:fs/promises';

function islandWrapper() {
	return (tree) => {
		for (const node of tree.body) {
			if (node.type === 'ExportDefaultDeclaration') {
				console.log('DEFAULT EXPORT kind:', node.declaration.type, node.declaration.name ?? '(fn)');
			}
			if (node.type === 'FunctionDeclaration') console.log('function decl:', node.id?.name);
		}
	};
}

const source = await readFile(
	'/Users/andeeplus/github/schema-engine/apps/docs/src/content/docs/tests/shared-demo-react.react.mdx',
	'utf-8',
);
await compile(source, { jsxImportSource: 'react', jsxRuntime: 'automatic', recmaPlugins: [islandWrapper] });
