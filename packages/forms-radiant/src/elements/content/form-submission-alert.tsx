import '@ecopages/radiant-ui/alert/styles.css';
import { customElement, prop, RadiantElement, state } from '@ecopages/radiant';
import { RuiAlert, RuiAlertIcon } from '@ecopages/radiant-ui/alert';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { SubmissionAlertProps } from '@/registry/forms/content/form-submission-alert.types';

type AlertStatus = 'idle' | 'success' | 'error';

@customElement('se-submission-alert')
export class SeSubmissionAlert extends RadiantElement {
	@prop({ type: Object }) config!: SubmissionAlertProps;

	@state status: AlertStatus = 'idle';

	protected override onConnected(): void {
		const form = this.closest('rui-form');
		if (!form) {
			return;
		}

		const onSubmit = () => {
			this.status = 'success';
		};
		const onInvalid = () => {
			this.status = 'error';
		};

		form.addEventListener('rui-submit', onSubmit);
		form.addEventListener('rui-invalid', onInvalid);
		this.registerCleanupCallback(() => {
			form.removeEventListener('rui-submit', onSubmit);
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
	return jsx('se-submission-alert', { 'prop:config': config });
}
