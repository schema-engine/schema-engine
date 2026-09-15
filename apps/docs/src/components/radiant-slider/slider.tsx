import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RadiantSliderProps as SliderProps } from './slider.script';
import '../radiant-field/field.css';
import './slider.css';

export const RadiantSlider = eco.component({
	dependencies: {
		scripts: ['./slider.script.tsx'],
	},
	render(props: JsxCustomElementAttributes<HTMLElement, SliderProps>) {
		return (
			<radiant-slider
				id={props.id}
				class={props.class}
				label={props.label}
				aria={{ label: props.ariaLabel }}
				description={props.description}
				min={props.min}
				max={props.max}
				step={props.step}
				value={props.value}
				unit={props.unit}
			/>
		);
	},
});
