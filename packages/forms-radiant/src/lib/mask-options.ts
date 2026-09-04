export type UnmaskMode = boolean | 'typed';
export type IMaskFactory = typeof import('imask').default;

export type PatternMaskConfig = {
	mask: string;
	unmask?: UnmaskMode;
	lazy?: boolean;
	overwrite?: boolean;
	placeholderChar?: string;
	definitions?: Record<string, string | RegExp>;
};

export type PatternMaskOptions = {
	mask: string;
	lazy?: boolean;
	overwrite?: boolean;
	placeholderChar?: string;
	definitions?: Record<string, RegExp>;
};

export type MaskValueSource = {
	value?: string;
	unmaskedValue?: string;
	typedValue?: string | number;
};

let imaskLoader: Promise<IMaskFactory> | undefined;

export function loadIMask() {
	imaskLoader ??= import('imask').then((module) => module.default);
	return imaskLoader;
}

export function parseUnmaskMode(value: unknown): UnmaskMode {
	if (value === 'typed') {
		return 'typed';
	}
	if (value === true || value === 'true') {
		return true;
	}
	return false;
}

export function createPatternMaskOptions(config: PatternMaskConfig): PatternMaskOptions {
	const options: PatternMaskOptions = { mask: config.mask };

	if (config.lazy !== undefined) {
		options.lazy = config.lazy;
	}
	if (config.overwrite !== undefined) {
		options.overwrite = config.overwrite;
	}
	if (config.placeholderChar !== undefined) {
		options.placeholderChar = config.placeholderChar;
	}
	if (config.definitions) {
		options.definitions = Object.fromEntries(
			Object.entries(config.definitions).map(([key, definition]) => [
				key,
				typeof definition === 'string' ? new RegExp(definition) : definition,
			]),
		);
	}

	return options;
}

export function maskToPlaceholder(mask: string): string {
	let result = '';
	let index = 0;

	while (index < mask.length) {
		const char = mask[index];

		if (char === '\\') {
			index += 1;
			if (index < mask.length) {
				result += mask[index];
				index += 1;
			}
			continue;
		}

		if (char === '[' || char === ']' || char === '{' || char === '}' || char === '`') {
			index += 1;
			continue;
		}

		if (char === '0') {
			result += '0';
		} else if (char === 'a') {
			result += 'A';
		} else if (char === '*') {
			result += '·';
		} else {
			result += char;
		}

		index += 1;
	}

	return result;
}

export function getMaskedInputPlaceholder(mask: string, placeholder?: string): string {
	if (placeholder?.trim()) {
		return placeholder;
	}

	return mask ? maskToPlaceholder(mask) : '';
}

export function readMaskValue(mask: MaskValueSource, unmask: UnmaskMode) {
	if (unmask === 'typed') {
		const typed = mask.typedValue;
		return typed == null ? '' : String(typed);
	}
	if (unmask) {
		return mask.unmaskedValue ?? '';
	}
	return mask.value ?? '';
}
