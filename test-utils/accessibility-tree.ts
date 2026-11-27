/// <reference types="@vitest/browser-playwright" />
/**
 * Reads the accessibility tree Chromium itself builds, over the Chrome DevTools Protocol.
 *
 * @remarks
 * A role query in the page (`getByRole`) computes roles and names from the DOM in script, so it cannot
 * catch a browser that drops a box's semantics, as `display: contents` once did. The tree read here is the
 * one assistive technology gets. It is Chromium only, like the browser projects that use it, and imported by
 * relative path because it is test-only. The reference above loads the Playwright provider's typing of `cdp()`.
 */
import { expect } from 'vitest';
import { cdp } from 'vitest/browser';
import { loadSsrFrame } from './ssr-grid-acceptance';

/** A group the browser exposes, with the names of the text boxes inside it. */
export interface AccessibleGroup {
	name: string;
	textboxes: string[];
}

interface FrameTree {
	frame: { id: string };
	childFrames?: FrameTree[];
}

function frameIds(tree: FrameTree): string[] {
	return [tree.frame.id, ...(tree.childFrames ?? []).flatMap(frameIds)];
}

/** Every `group` of every frame of the page, as the browser's accessibility tree has it. */
export async function accessibleGroups(): Promise<AccessibleGroup[]> {
	const session = cdp();
	const { frameTree } = await session.send('Page.getFrameTree');
	const groups: AccessibleGroup[] = [];
	for (const frameId of frameIds(frameTree)) {
		const { nodes } = await session.send('Accessibility.getFullAXTree', { frameId });
		const byId = new Map(nodes.map((node) => [node.nodeId, node]));
		const textboxes = (node: (typeof nodes)[number]): string[] =>
			(node.childIds ?? []).flatMap((id) => {
				const child = byId.get(id);
				if (!child) return [];
				const own = !child.ignored && child.role?.value === 'textbox' ? [String(child.name?.value ?? '')] : [];
				return [...own, ...textboxes(child)];
			});
		for (const node of nodes) {
			if (node.ignored || node.role?.value !== 'group') continue;
			groups.push({ name: String(node.name?.value ?? ''), textboxes: textboxes(node) });
		}
	}
	return groups;
}

/**
 * Asserts that the subgrid fieldset of a server-rendered document is a group named by its legend, holding its fields.
 *
 * @param html Server-rendered document of the `widths` subgrid variant.
 */
export async function expectSsrSubgridGroupAcceptance(html: string): Promise<void> {
	const { frame } = await loadSsrFrame(html, 1000);
	try {
		expect(await accessibleGroups()).toContainEqual({ name: 'Address', textboxes: ['Street', 'City', 'Notes'] });
	} finally {
		frame.remove();
	}
}
