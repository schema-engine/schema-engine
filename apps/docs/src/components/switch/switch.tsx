import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RadiantSwitchProps } from './switch.script';
import './switch.css';

export const RadiantSwitch = eco.component({
	dependencies: {
		scripts: ['./switch.script.tsx'],
	},
	render(props: JsxCustomElementAttributes<HTMLElement, RadiantSwitchProps>) {
		return <radiant-switch class="radiant-switch" {...props}></radiant-switch>;
	},
});
