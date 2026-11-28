import { createContext } from '@ecopages/radiant/context';

import type { FormRuntime, FormSubmissionState, FormWizard } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import type { FormMeta } from '../lib/instance-view.js';

/**
 * What a `se-form-instance` publishes to the hosts under it, for the blocks and recipes of a renderer.
 *
 * @remarks
 * An application reads the wizard and the submission with `FormController`, which follows the instance and its runtime. This context
 * is for a renderer author's custom block or recipe, which also needs the form chrome (`meta`), whether a wizard recipe owns navigation, and the formatter.
 * The wizard fields are those of the form's runtime (see {@link FormWizard}).
 */
export interface FormInstanceContextValue extends FormWizard {
	/** True when a wizard recipe owns navigation and steps toggle visibility. */
	isWizard: boolean;
	/** Serializable form chrome, so a consumer needs no walk to the instance for its config. */
	meta?: FormMeta;
	/** The runtime's submission: its status (`validating` while it is checked, `submitting` once it passed and its actions and `onSubmit` run), its failures and the submissions that ended, a failed validation included, since the form was created or reset. */
	submission: FormSubmissionState;
	/**
	 * The form's runtime: its state container (`runtime.container`: values, field state, row ids and validation), its submission and its steps.
	 *
	 * @remarks
	 * Absent until the instance has a config, an engine and its `rui-form`, and on the server. A new runtime, and a new container with it, replaces it when the config or the engine changes, so a consumer reads it from this context rather than keeping it.
	 */
	runtime: FormRuntime | undefined;
	/** Turns an issue into text; the application's i18n layer, given to the renderer. */
	formatIssue: FormIssueFormatter | undefined;
}

export const formInstanceContext = createContext<FormInstanceContextValue | undefined>(
	Symbol.for('se-form-instance-context'),
);
