/** @jsxImportSource react */
import { Fragment, useEffect, useState } from 'react';
import { formatIssuePath, safeParseNode, type StandardSchemaIssue } from '@schema-engine/registry';
import { components } from './components.react';

function Fallback({ issues }: { issues: StandardSchemaIssue[] }) {
	return (
		<ul role="alert">
			{issues.map(({ path, message }, index) => {
				const where = formatIssuePath(path);
				return <li key={index}>{where ? `${where}: ${message}` : message}</li>;
			})}
		</ul>
	);
}

/**
 * Draws each node of a document with the component its `$type` names.
 *
 * @remarks
 * A node that fails validation is drawn as its issues, in its place, and the other nodes still render. Each issue's
 * path starts with the index of the node.
 */
export function DocumentView({ nodes }: { nodes: unknown }) {
	if (!Array.isArray(nodes)) return <Fallback issues={[{ message: 'A document is a list of nodes.', path: [] }]} />;
	return (
		<>
			{nodes.map((node: unknown, index) => {
				const parsed = safeParseNode(components, node, { path: [index] });
				return parsed.success ? (
					<Fragment key={index}>{parsed.registration.render(parsed.data)}</Fragment>
				) : (
					<Fallback key={index} issues={parsed.issues} />
				);
			})}
		</>
	);
}

/** What the fetch of `url` ended with. Without a result for the current `url`, the document is still loading. */
type Loaded = { url: string } & ({ status: 'failed' } | { status: 'ready'; nodes: unknown });

/**
 * Fetches the document at `url` and draws it.
 *
 * @remarks
 * A status that is not a success, a network failure and a body that is not JSON are one message.
 */
export function ServerDocument({ url }: { url: string }) {
	const [loaded, setLoaded] = useState<Loaded>();
	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			try {
				const headers = { Accept: 'application/json' };
				const response = await fetch(url, { headers, signal: controller.signal });
				setLoaded(
					response.ok ? { url, status: 'ready', nodes: await response.json() } : { url, status: 'failed' },
				);
			} catch {
				if (!controller.signal.aborted) setLoaded({ url, status: 'failed' });
			}
		}
		void load();
		return () => controller.abort();
	}, [url]);

	if (loaded?.url !== url) return <p>Loading the page</p>;
	if (loaded.status === 'failed') return <p role="alert">The page could not be loaded.</p>;
	return <DocumentView nodes={loaded.nodes} />;
}
