import { RadiantElement, customElement, prop, state } from '@ecopages/radiant';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RuiSpinner } from '@ecopages/radiant-ui/spinner';
import {
	createActionPlaygroundSession,
	idlePlaygroundSnapshot,
	type ActionPlaygroundSession,
	type PlaygroundExampleId,
	type PlaygroundNode,
	type PlaygroundSnapshot,
} from './action-playground-session';

export type ActionPlaygroundProps = {
	example?: PlaygroundExampleId;
	delayMs?: number;
};

function PlayIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M8 5.14v13.72L19 12 8 5.14z" />
		</svg>
	);
}

function StopIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<rect x="6" y="6" width="12" height="12" rx="1.5" />
		</svg>
	);
}

function ResetIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="15"
			height="15"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.25"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M3 12a9 9 0 1 0 3-6.7" />
			<polyline points="3 4 3 9 8 9" />
		</svg>
	);
}

function controlIcon(phase: PlaygroundSnapshot['phase']) {
	if (phase === 'running') return <StopIcon />;
	if (phase === 'done') return <ResetIcon />;
	return <PlayIcon />;
}

function controlLabel(name: string, phase: PlaygroundSnapshot['phase']): string {
	if (phase === 'running') return `Interrupt ${name}`;
	if (phase === 'done') return `Reset ${name}`;
	return `Run ${name}`;
}

function nodeLabel(node: PlaygroundNode, phase: PlaygroundSnapshot['phase']): string {
	if (phase === 'running' && node.status === 'running') return `Interrupt ${node.label}`;
	if (phase === 'done') return `Reset ${node.label}`;
	return `Run ${node.label}`;
}

function liveMessage(snapshot: PlaygroundSnapshot): string {
	if (snapshot.phase === 'running') {
		const running = snapshot.nodes.filter((node) => node.status === 'running').map((node) => node.label);
		return running.length > 0 ? `${running.join(', ')} running` : `${snapshot.name} running`;
	}
	if (snapshot.phase === 'done') {
		return `${snapshot.name} ${snapshot.result.status}`;
	}
	return '';
}

function ActionNodeButton({
	node,
	phase,
	className,
}: {
	node: PlaygroundNode;
	phase: PlaygroundSnapshot['phase'];
	className?: string;
}) {
	const isResult = node.id === 'result';
	return (
		<button
			type="button"
			class={className ? `action-node ${className}` : 'action-node'}
			data-node-id={node.id}
			data-status={node.status}
			aria-label={nodeLabel(node, phase)}
		>
			<span class="action-node__orb">
				{isResult ? null : <span class="action-node__ring" aria-hidden="true" />}
				{isResult && node.status === 'running' ? (
					<RuiSpinner size="md" aria={{ label: `${node.label} running` }} />
				) : (
					<span class="action-node__value">{node.value ?? ''}</span>
				)}
			</span>
			<span class="action-node__label">{node.label}</span>
		</button>
	);
}

function NodeList({ snapshot }: { snapshot: PlaygroundSnapshot }) {
	const grouped = snapshot.example === 'parallel';
	return (
		<div class={grouped ? 'action-playground__nodes action-playground__nodes--group' : 'action-playground__nodes'}>
			{snapshot.nodes.map((node, index) => (
				<>
					{!grouped && index > 0 ? (
						<span
							class="action-playground__connector"
							data-status={snapshot.nodes[index - 1]?.status}
							aria-hidden="true"
						/>
					) : null}
					<ActionNodeButton node={node} phase={snapshot.phase} />
				</>
			))}
		</div>
	);
}

/**
 * Interactive dispatcher playground for the Actions overview.
 *
 * @remarks
 * Clicks are handled on the host because Radiant `@onEvent` is not wired when
 * this element owns its listener lifecycle. `@state revision` is read in the
 * template so a session snapshot re-renders.
 */
@customElement('se-action-playground')
export class ActionPlaygroundElement extends RadiantElement {
	@prop({ type: String }) example: PlaygroundExampleId = 'sequential';
	@prop({ type: Number, attribute: 'delay-ms' }) delayMs = -1;
	@state revision = 0;

	private session: ActionPlaygroundSession | null = null;
	private unsubscribe: (() => void) | null = null;
	private sessionKey = '';
	private listening = false;

	override disconnectedCallback(): void {
		this.tearDownSession();
		super.disconnectedCallback();
	}

	private tearDownSession(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.session?.dispose();
		this.session = null;
		this.sessionKey = '';
		if (this.listening) {
			this.removeEventListener('click', this.onHostClick);
			this.listening = false;
		}
	}

	private ensureSession(): ActionPlaygroundSession {
		const key = `${this.example}:${this.delayMs}`;
		if (this.session && this.sessionKey === key) return this.session;
		this.tearDownSession();
		const delayMs = this.delayMs >= 0 ? this.delayMs : undefined;
		this.session = createActionPlaygroundSession(this.example, delayMs === undefined ? {} : { delayMs });
		this.sessionKey = key;
		this.unsubscribe = this.session.subscribe(() => {
			this.revision += 1;
		});
		if (!this.listening) {
			this.addEventListener('click', this.onHostClick);
			this.listening = true;
			this.setAttribute('data-ready', '');
		}
		return this.session;
	}

	private onHostClick = (event: Event) => {
		const target = (event.target as HTMLElement | null)?.closest('[data-node-id], .action-playground__control');
		if (!(target instanceof HTMLElement) || !this.contains(target)) return;
		this.handleActivate(target.dataset.nodeId ?? 'result');
	};

	private handleActivate(target: string): void {
		void this.ensureSession().activate(target);
	}

	override render() {
		if (this.isConnected) this.ensureSession();
		const snapshot = this.session?.snapshot() ?? idlePlaygroundSnapshot(this.example);
		const message = liveMessage(snapshot);

		return (
			<article
				class="action-playground"
				data-example={snapshot.example}
				data-phase={snapshot.phase}
				data-revision={String(this.revision)}
			>
				<header class="action-playground__header">
					<button
						type="button"
						class="action-playground__control"
						data-phase={snapshot.phase}
						aria-label={controlLabel(snapshot.name, snapshot.phase)}
					>
						{controlIcon(snapshot.phase)}
					</button>
					<div class="action-playground__copy">
						<h3 class="action-playground__title">{snapshot.name}</h3>
						<p class="action-playground__description">{snapshot.description}</p>
					</div>
				</header>
				<div class="action-playground__stage">
					<NodeList snapshot={snapshot} />
					<span
						class="action-playground__connector action-playground__connector--join"
						data-status={snapshot.result.status === 'idle' ? 'idle' : 'succeeded'}
						aria-hidden="true"
					/>
					<ActionNodeButton node={snapshot.result} phase={snapshot.phase} className="action-node--result" />
				</div>
				<pre class="action-playground__code">
					<code>{snapshot.code}</code>
				</pre>
				<div class="sr-only" aria-live="polite">
					{message}
				</div>
			</article>
		);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'se-action-playground': JsxCustomElementAttributes<ActionPlaygroundElement, ActionPlaygroundProps>;
	}
}
