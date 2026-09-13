import './action-triggers.demo.css';
import { customElement, onEvent, RadiantElement, state } from '@ecopages/radiant';
import { RuiBadge } from '@ecopages/radiant-ui/badge';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { formResetPlugin, formSubmitPlugin, FormActionTriggerSchema } from '@schema-engine/forms/actions';
import type {
	ActionExecutionResult,
	BuilderActionExecutionContext,
	BuilderActionRegistration,
} from '@schema-engine/forms';
import type { FormConfig } from '@schema-engine/forms/schemas';
import * as z from 'zod/mini';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormController } from '@/adapters/radiant/controller';
import { schemaFormRegistrations } from '@/registrations';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { radiantAdapter, ValidationPresets } from '@/stories/shared/form-builder';

export interface ActionLogEntry {
	id: string;
	trigger: string;
	timestamp: Date;
	message: string;
	changedField?: string;
	changedValue?: unknown;
}

class ActionEventDispatcher {
	private listeners: Array<(entry: Omit<ActionLogEntry, 'id'>) => void> = [];

	dispatch(entry: Omit<ActionLogEntry, 'id'>): void {
		this.listeners.forEach((listener) => listener(entry));
	}

	subscribe(listener: (entry: Omit<ActionLogEntry, 'id'>) => void): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((current) => current !== listener);
		};
	}
}

const actionEventDispatcher = new ActionEventDispatcher();
const LoggerActionSchema = z.object({
	id: z.string(),
	$type: z.literal('event_logger'),
	description: z.optional(z.string()),
	enabled: z._default(z.boolean(), true),
	triggers: z.optional(z.array(FormActionTriggerSchema)),
});
type LoggerAction = z.infer<typeof LoggerActionSchema>;

function loggerPlugin(): BuilderActionRegistration<'event_logger', typeof LoggerActionSchema> {
	let previousFormData: Record<string, unknown> = {};
	return {
		$type: 'event_logger',
		schema: LoggerActionSchema,
		metadata: {
			name: 'Event Logger',
			description: 'Logs action triggers for the real-time dashboard',
			icon: 'activity',
			defaultTriggers: ['form_mount', 'form_change', 'form_submit'],
		},
		execute: async (context: BuilderActionExecutionContext<LoggerAction>): Promise<ActionExecutionResult> => {
			const formData = context.formData;
			let changedField: string | undefined;
			let changedValue: unknown;
			if (context.trigger === 'form_change') {
				changedField = Object.keys(formData).find((field) => formData[field] !== previousFormData[field]);
				changedValue = changedField ? formData[changedField] : undefined;
			}

			actionEventDispatcher.dispatch({
				trigger: context.trigger,
				timestamp: new Date(),
				message: changedField
					? `Event: ${context.trigger} (${changedField}: ${JSON.stringify(changedValue)})`
					: `Event: ${context.trigger}`,
				changedField,
				changedValue,
			});
			previousFormData = { ...formData };
			return { success: true, message: 'Logged event', shouldContinue: true };
		},
	};
}

const demoLoggerPlugin = loggerPlugin();
const demoEngine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	actions: [
		demoLoggerPlugin,
		formSubmitPlugin({
			request: async () =>
				new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } }),
		}),
		formResetPlugin({ confirm: () => true }),
	],
});

const demoFormConfig = {
	id: 'action-triggers-demo',
	title: 'Action Triggers Demo',
	description: 'Interact with the form to see actions trigger in real time.',
	mode: 'free',
	steps: [
		{
			id: 'demo',
			title: 'Demo',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					placeholder: 'Type to trigger form_change',
					inputType: 'text',
					rules: [ValidationPresets.string.required('Name is required')],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					placeholder: 'Enter your email',
					inputType: 'email',
					rules: [ValidationPresets.string.email('Valid email required')],
				},
				{ $type: 'checkbox', id: 'subscribe', name: 'subscribe', label: 'Subscribe to newsletter' },
				{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit Form' },
			],
		},
	],
	actions: [
		{ id: 'submit-action', $type: 'submit', enabled: true, endpoint: '/action-triggers-demo', method: 'POST' },
		{
			id: 'log-all-events',
			$type: 'event_logger',
			enabled: true,
			triggers: [
				'form_mount',
				'form_change',
				'form_submit',
				'form_submit_start',
				'form_submit_success',
				'form_submit_error',
				'form_submit_complete',
			],
		},
		{
			id: 'reset-on-success',
			$type: 'reset',
			enabled: true,
			resetToDefaults: true,
			triggers: ['form_submit_success'],
		},
	],
} as unknown as FormConfig;

@customElement('se-action-dashboard')
export class ActionDashboardElement extends RadiantElement {
	@state logs: ActionLogEntry[] = [];

	protected override onConnected(): void {
		this.registerCleanupCallback(
			actionEventDispatcher.subscribe((entry) => {
				this.logs = [{ id: `${Date.now()}-${Math.random()}`, ...entry }, ...this.logs];
			}),
		);
	}

	@onEvent({ type: 'click', selector: '[data-action="clear"]' })
	clear(): void {
		this.logs = [];
	}

	override render() {
		const grouped = this.logs.reduce<Record<string, ActionLogEntry[]>>((groups, log) => {
			(groups[log.trigger] ??= []).push(log);
			return groups;
		}, {});
		return (
			<div class="se-action-demo__dashboard" data-testid="action-dashboard">
				<section class="se-action-demo__card">
					<div class="se-action-demo__card-header">
						<RuiHeading size="sm" class="se-action-demo__card-heading">
							<RuiHeadingTitle as="h3">Real-Time Action Log</RuiHeadingTitle>
							<RuiHeadingDescription>
								All actions executed in chronological order ({this.logs.length} total)
							</RuiHeadingDescription>
						</RuiHeading>
						<RuiButton type="button" variant="outline" size="sm" data-action="clear">
							Clear logs
						</RuiButton>
					</div>
					<div class="se-action-demo__scroll">
						<ul class="se-action-demo__log-list">
							{this.logs.length ? (
								this.logs.map((log) => (
									<li class="se-action-demo__log" data-trigger={log.trigger}>
										<RuiBadge
											variant="filled"
											class="se-action-demo__badge"
											data-trigger={log.trigger}
										>
											{log.trigger}
										</RuiBadge>
										<div class="se-action-demo__log-copy">
											<p>{log.message}</p>
											{log.changedField ? (
												<p class="se-action-demo__changed-value">
													<strong>{log.changedField}:</strong>{' '}
													{JSON.stringify(log.changedValue)}
												</p>
											) : null}
											<small>{log.timestamp.toLocaleTimeString()}</small>
										</div>
									</li>
								))
							) : (
								<li class="se-action-demo__empty">
									No actions executed yet. Type in the form or submit to see actions trigger.
								</li>
							)}
						</ul>
					</div>
				</section>
				<section class="se-action-demo__card">
					<RuiHeading size="sm" class="se-action-demo__card-heading">
						<RuiHeadingTitle as="h3">Events by Trigger</RuiHeadingTitle>
						<RuiHeadingDescription>Grouped view of all trigger types</RuiHeadingDescription>
					</RuiHeading>
					<div class="se-action-demo__scroll">
						<ul class="se-action-demo__summary-list">
							{Object.keys(grouped).length ? (
								Object.entries(grouped).map(([trigger, logs]) => (
									<li
										class="se-action-demo__trigger-summary"
										data-testid={trigger}
										data-trigger={trigger}
									>
										<div>
											<RuiBadge
												variant="filled"
												class="se-action-demo__badge"
												data-trigger={trigger}
											>
												{trigger}
											</RuiBadge>
											<span class="se-action-demo__count">({logs.length} times)</span>
										</div>
										<div class="se-action-demo__trigger-details">
											{logs.map((log) => (
												<p>
													{log.message} at {log.timestamp.toLocaleTimeString()}
												</p>
											))}
										</div>
									</li>
								))
							) : (
								<li class="se-action-demo__empty">No triggers fired yet.</li>
							)}
						</ul>
					</div>
				</section>
			</div>
		);
	}
}

function ActionDashboard() {
	return <se-action-dashboard />;
}

@customElement('se-action-demo-controls')
export class ActionDemoControlsElement extends RadiantElement {
	@onEvent({ type: 'click', selector: '[data-action="reset"]' })
	reset(): void {
		const demo = this.closest('.se-action-demo');
		const ruiForm = demo?.querySelector('rui-form');
		if (ruiForm instanceof HTMLElement) new FormController(ruiForm).reset();
	}

	override render() {
		return (
			<RuiButton type="button" variant="outline" size="sm" data-action="reset">
				Reset form
			</RuiButton>
		);
	}
}

function ActionDemoControls() {
	return <se-action-demo-controls />;
}

export function ActionTriggersDemo() {
	return (
		<div class="se-action-demo">
			<header class="se-action-demo__header">
				<RuiHeading size="sm" class="se-action-demo__page-heading">
					<RuiHeadingTitle as="h2">Action Triggers Interactive Demo</RuiHeadingTitle>
					<RuiHeadingDescription>
						Watch all action triggers fire in real-time as you interact with the form.
					</RuiHeadingDescription>
				</RuiHeading>
				<div class="se-action-demo__controls">
					<ActionDemoControls />
				</div>
			</header>
			<div class="se-action-demo__grid">
				<div>
					<section class="se-action-demo__card">
						<RuiHeading size="sm" class="se-action-demo__card-heading">
							<RuiHeadingTitle as="h3">Interactive Form</RuiHeadingTitle>
							<RuiHeadingDescription>Fill out the form to trigger actions</RuiHeadingDescription>
						</RuiHeading>
						<div class="se-action-demo__form">
							<FormRenderer config={demoFormConfig} engine={demoEngine} adapter={radiantAdapter} />
						</div>
					</section>
					<section class="se-action-demo__card">
						<RuiHeading size="sm" class="se-action-demo__card-heading">
							<RuiHeadingTitle as="h3">Available Triggers</RuiHeadingTitle>
							<RuiHeadingDescription>Events that can trigger actions</RuiHeadingDescription>
						</RuiHeading>
						<ul class="se-action-demo__trigger-list">
							{[
								'form_mount',
								'form_change',
								'form_submit',
								'form_submit_start',
								'form_submit_success',
								'form_submit_error',
								'form_submit_complete',
							].map((trigger) => (
								<li>
									<RuiBadge variant="filled" class="se-action-demo__badge" data-trigger={trigger}>
										{trigger}
									</RuiBadge>
									<span>
										{trigger === 'form_mount'
											? 'Fires when form initializes'
											: trigger === 'form_change'
												? 'Fires when any field value changes'
												: `Fires when ${trigger.replaceAll('_', ' ')}`}
									</span>
								</li>
							))}
						</ul>
					</section>
				</div>
				<ActionDashboard />
			</div>
		</div>
	);
}
