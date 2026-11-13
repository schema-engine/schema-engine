import { customElement, prop, RadiantElement, state } from '@ecopages/radiant';
import { RuiAlert, RuiAlertIcon } from '@ecopages/radiant-ui/alert';
import { GRID_ITEM_CLASS } from '@schema-engine/layout';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import type { SubmissionAlertProps } from './form-submission-alert.types';

type AlertStatus = 'idle' | 'pending' | 'success' | 'error';

@customElement('se-submission-alert')
export class SeSubmissionAlert extends RadiantElement {
	declare readonly [JSX_PROPS]?: { config: SubmissionAlertProps };

	@prop({ type: Object }) config!: SubmissionAlertProps;

	@state protected status: AlertStatus = 'idle';
	private dismissTimer?: ReturnType<typeof setTimeout>;

	private setStatus(next: AlertStatus): void {
		this.status = next;
		if (this.dismissTimer) {
			clearTimeout(this.dismissTimer);
			this.dismissTimer = undefined;
		}
		const config = this.config;
		if (config?.autoDismiss && next !== 'idle') {
			this.dismissTimer = setTimeout(() => {
				this.status = 'idle';
			}, config.autoDismiss);
		}
	}

	protected override onConnected(): void {
		const form = this.closest('rui-form');
		if (!form) {
			return;
		}

		const onSubmitStart = () => {
			this.setStatus('pending');
		};
		const onSubmitComplete = (event: Event) => {
			const custom = event as CustomEvent<{ succeeded?: boolean }>;
			this.setStatus(custom.detail?.succeeded !== false ? 'success' : 'error');
		};
		const onInvalid = () => {
			this.setStatus('error');
		};

		form.addEventListener('se-action-submit-start', onSubmitStart);
		form.addEventListener('se-action-submit-complete', onSubmitComplete);
		form.addEventListener('rui-invalid', onInvalid);
		this.registerCleanupCallback(() => {
			if (this.dismissTimer) {
				clearTimeout(this.dismissTimer);
			}
			form.removeEventListener('se-action-submit-start', onSubmitStart);
			form.removeEventListener('se-action-submit-complete', onSubmitComplete);
			form.removeEventListener('rui-invalid', onInvalid);
		});
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) {
			return null;
		}

		const showOn = config.showOn ?? ['error', 'success'];
		if (!showOn.includes(this.status)) {
			return null;
		}

		if (this.status === 'pending') {
			return (
				<RuiAlert variant="info" layout="inline">
					<RuiAlertIcon variant="info" />
					{config.pendingMessage || 'Submitting form...'}
				</RuiAlert>
			);
		}

		if (this.status === 'success') {
			return (
				<RuiAlert variant="success" layout="inline">
					<RuiAlertIcon variant="success" />
					{config.successMessage || 'Form submitted successfully'}
				</RuiAlert>
			);
		}

		if (this.status === 'error') {
			return (
				<RuiAlert variant="error" layout="inline">
					<RuiAlertIcon variant="error" />
					{config.errorMessage || 'An error occurred during submission'}
				</RuiAlert>
			);
		}

		return null;
	}
}

export function FormSubmissionAlert(config: SubmissionAlertProps) {
	const fieldHost = mergeFieldGridHost(config.grid, config.style);

	return (
		<SeSubmissionAlert
			classes={['se-form-field', GRID_ITEM_CLASS, config.className]}
			data-se-theme={fieldHost.themeId}
			style={fieldHost.style}
			config={config}
		/>
	);
}
