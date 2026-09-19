import './form-drop-zone.css';
import { customElement, onEvent, prop, query, RadiantElement, state } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { toFieldRules } from '@/lib/field-rules';
import type { DropZoneFieldProps } from '@/registry/forms/inputs/form-drop-zone.types';

type AcceptMap = Record<string, string[]>;

function formatBytes(bytes: number) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(2)}${units[unitIndex]}`;
}

function acceptAttribute(accept?: AcceptMap) {
	if (!accept) {
		return undefined;
	}

	return Object.entries(accept)
		.flatMap(([mime, extensions]) => [mime, ...extensions])
		.join(',');
}

function fileMatchesAccept(file: File, accept?: AcceptMap) {
	if (!accept || Object.keys(accept).length === 0) {
		return true;
	}

	const name = file.name.toLowerCase();
	const type = file.type;

	for (const [mime, extensions] of Object.entries(accept)) {
		if (mime.endsWith('/*') && type.startsWith(mime.slice(0, -1))) {
			return true;
		}
		if (type === mime) {
			return true;
		}
		if (extensions.some((extension) => name.endsWith(extension.toLowerCase()))) {
			return true;
		}
	}

	return false;
}

function formatFileNames(files: File[]) {
	const maxLabelItems = 3;
	if (files.length > maxLabelItems) {
		return `${new Intl.ListFormat('en').format(files.slice(0, maxLabelItems).map((file) => file.name))} and ${files.length - maxLabelItems} more`;
	}
	return new Intl.ListFormat('en').format(files.map((file) => file.name));
}

@customElement('se-drop-zone')
export class SeDropZone extends RadiantElement {
	@prop({ type: String }) name = '';
	@prop({ type: Number, defaultValue: 1 }) maxFiles = 1;
	@prop({ type: Number, defaultValue: 0 }) maxSize = 0;
	@prop({ type: Number, defaultValue: 0 }) minSize = 0;
	@prop({ type: Boolean, defaultValue: false }) disabled = false;
	@prop({ type: Object }) accept?: AcceptMap;

	@state dragging = false;
	@state files: File[] = [];

	@query({ ref: 'input' }) fileInput!: HTMLInputElement;

	@onEvent({ type: 'dragover', selector: '[data-ref="surface"]' })
	onDragOver(event: Event) {
		event.preventDefault();
		if (!this.disabled) {
			this.dragging = true;
		}
	}

	@onEvent({ type: 'dragleave', selector: '[data-ref="surface"]' })
	onDragLeave() {
		this.dragging = false;
	}

	@onEvent({ type: 'drop', selector: '[data-ref="surface"]' })
	onDrop(event: Event) {
		event.preventDefault();
		this.dragging = false;
		if (this.disabled) {
			return;
		}
		const dataTransfer = (event as DragEvent).dataTransfer;
		this.applyFiles(Array.from(dataTransfer?.files ?? []));
	}

	@onEvent({ type: 'click', selector: '[data-ref="surface"]' })
	onSurfaceClick() {
		if (!this.disabled) {
			this.fileInput?.click();
		}
	}

	@onEvent({ type: 'change', selector: '[data-ref="input"]' })
	onInputChange(event: Event) {
		const input = event.target as HTMLInputElement;
		this.applyFiles(Array.from(input.files ?? []));
	}

	private applyFiles(nextFiles: File[]) {
		const accepted = nextFiles.filter((file) => {
			if (!fileMatchesAccept(file, this.accept)) {
				return false;
			}
			if (this.minSize > 0 && file.size < this.minSize) {
				return false;
			}
			if (this.maxSize > 0 && file.size > this.maxSize) {
				return false;
			}
			return true;
		});

		this.files = accepted.slice(0, this.maxFiles || accepted.length);
		this.syncNativeInput();
		this.dispatchEvent(
			new CustomEvent('change', {
				bubbles: true,
				detail: { files: this.files },
			}),
		);
	}

	private syncNativeInput() {
		if (!this.fileInput || typeof DataTransfer === 'undefined') {
			return;
		}

		const transfer = new DataTransfer();
		for (const file of this.files) {
			transfer.items.add(file);
		}
		this.fileInput.files = transfer.files;
	}

	private caption() {
		const parts: string[] = [];
		if (this.accept) {
			parts.push(`Accepts ${new Intl.ListFormat('en').format(Object.keys(this.accept))}`);
		}
		if (this.minSize > 0 && this.maxSize > 0) {
			parts.push(`between ${formatBytes(this.minSize)} and ${formatBytes(this.maxSize)}`);
		} else if (this.minSize > 0) {
			parts.push(`at least ${formatBytes(this.minSize)}`);
		} else if (this.maxSize > 0) {
			parts.push(`less than ${formatBytes(this.maxSize)}`);
		}
		return parts.join(' ');
	}

	override render(): JsxRenderable {
		const hasFiles = this.files.length > 0;
		const caption = this.caption();

		return (
			<div
				class="se-dropzone"
				data-ref="surface"
				data-dragging={this.dragging ? 'true' : 'false'}
				data-disabled={this.disabled ? 'true' : 'false'}
			>
				<input
					data-ref="input"
					data-rui-control
					class="se-dropzone__input"
					type="file"
					name={this.name}
					multiple={this.maxFiles > 1}
					accept={acceptAttribute(this.accept)}
					disabled={this.disabled}
				/>
				<p class="se-dropzone__title">
					{hasFiles ? formatFileNames(this.files) : `Upload ${this.maxFiles === 1 ? 'a file' : 'files'}`}
				</p>
				<p class="se-dropzone__caption">
					{hasFiles ? 'Drag and drop or click to replace' : 'Drag and drop or click to upload'}
				</p>
				{caption ? <p class="se-dropzone__caption">{caption}.</p> : null}
			</div>
		);
	}
}

export function FormDropZone({
	onChange: propsOnChange,
	onDropChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: DropZoneFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			rules={toFieldRules(config)}
			defaultValue={config.defaultValue ?? []}
			disabled={config.disabled}
		>
			{jsx('se-drop-zone', {
				name: config.name,
				'prop:maxFiles': config.maxFiles ?? 1,
				'prop:maxSize': config.maxSize ?? 0,
				'prop:minSize': config.minSize ?? 0,
				'prop:accept': config.accept,
				disabled: config.disabled,
				'on:change': (event: Event) => {
					const files = (event as CustomEvent<{ files?: File[] }>).detail?.files ?? [];
					propsOnChange?.(files);
					onDropChange?.(files);
				},
				'on:blur': propsOnBlur,
				'on:focus': propsOnFocus,
			})}
		</FieldGroup>
	);
}
