/** One entity of the domain and the colour it is known by. */
export interface Machine {
	id: string;
	color: string;
}

/**
 * The machines of a music app, each with its own colour.
 *
 * @remarks
 * Stands for the host's own data (a database, a design file): the identity tokens page generates its stylesheet from
 * it, and no appearance axis could hold it, since an axis has at most five values.
 */
export const machines: readonly Machine[] = [
	{ id: 'sampler', color: '#e4572e' },
	{ id: 'synth', color: '#f2a541' },
	{ id: 'drums', color: '#d7263d' },
	{ id: 'bass', color: '#7b2cbf' },
	{ id: 'keys', color: '#3a86ff' },
	{ id: 'pads', color: '#06a77d' },
	{ id: 'lead', color: '#ff006e' },
	{ id: 'arp', color: '#8338ec' },
	{ id: 'vocal', color: '#fb5607' },
	{ id: 'strings', color: '#2a9d8f' },
	{ id: 'brass', color: '#e9c46a' },
	{ id: 'organ', color: '#8d5524' },
	{ id: 'delay', color: '#4cc9f0' },
	{ id: 'reverb', color: '#4361ee' },
	{ id: 'chorus', color: '#80b918' },
	{ id: 'mixer', color: '#6c757d' },
	{ id: 'master', color: '#212529' },
];
