import { eco } from '@ecopages/core';
import './burger.css';

export const Burger = eco.component<{ class?: string }>({
	dependencies: {
		scripts: ['./burger.script.ts'],
	},
	render: ({ class: className }) => {
		return (
			<radiant-burger class={className}>
				<button type="button" class="burger" aria-label="Toggle Navigation">
					<span class="burger__line"></span>
					<span class="burger__line"></span>
					<span class="burger__line"></span>
				</button>
			</radiant-burger>
		);
	},
});
