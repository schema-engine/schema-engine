import { eco } from '@ecopages/core';
import type { RadiantCodeTabsProps } from './code-tabs.script.tsx';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
// oxlint-disable-next-line import/no-unassigned-import -- custom-element types
import './code-tabs.script.tsx';
import './code-tabs.css';

export const CodeTabs = eco.component({
	dependencies: {
		scripts: ['./code-tabs.script.tsx'],
	},
	render(props: JsxCustomElementAttributes<HTMLElement, RadiantCodeTabsProps>) {
		return (
			<radiant-code-tabs
				class={props.class}
				name={props.name}
				label={props.label}
				tabs={props.tabs}
				copyLabel={props.copyLabel}
				defaultSelectedKey={props.defaultSelectedKey}
				selectedKey={props.selectedKey}
			/>
		);
	},
});
