import { customElement, prop, RadiantElement, state } from '@ecopages/radiant';
import { RuiAlert, RuiAlertIcon } from '@ecopages/radiant-ui/alert';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { SubmissionAlertProps } from './form-submission-alert.types';

type AlertStatus = 'idle' | 'pending' | 'success' | 'error';

@customElement('se-submission-alert')
export class SeSubmissionAlert extends RadiantElement {
	@prop({ type: Object }) config!: SubmissionAlertProps;

	@state status: AlertStatus = 'idle';
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
		const onRuiSubmit = () => {
			const hasActionController = !!form.querySelector('se-form-action-controller');
			if (hasActionController) {
				return;
			}
			const config = this.config;
			if (config?.showOn?.includes('pending')) {
				this.setStatus('pending');
			} else {
				this.setStatus('success');
			}
		};
		const onInvalid = () => {
			this.setStatus('error');
		};

		form.addEventListener('se-action-submit-start', onSubmitStart);
		form.addEventListener('se-action-submit-complete', onSubmitComplete);
		form.addEventListener('rui-submit', onRuiSubmit);
		form.addEventListener('rui-invalid', onInvalid);
		this.registerCleanupCallback(() => {
			if (this.dismissTimer) {
				clearTimeout(this.dismissTimer);
			}
			form.removeEventListener('se-action-submit-start', onSubmitStart);
			form.removeEventListener('se-action-submit-complete', onSubmitComplete);
			form.removeEventListener('rui-submit', onRuiSubmit);
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

	return jsx('se-submission-alert', {
		classes: ['se-form-field'],
		'data-se-grid-theme': fieldHost.themeId,
		style: fieldHost.style,
		config,
	});
}
