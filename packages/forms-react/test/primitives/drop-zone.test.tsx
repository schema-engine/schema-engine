import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/schema-engine/components/drop-zone';

describe('Dropzone primitive', () => {
	test('shows empty state guidance before files are selected', () => {
		render(
			<Dropzone>
				<DropzoneEmptyState />
			</Dropzone>,
		);

		expect(screen.getByText('Upload a file')).toBeInTheDocument();
		expect(screen.getByText('Drag and drop or click to upload')).toBeInTheDocument();
	});

	test('shows selected file names in content state', () => {
		const file = new File(['hello'], 'report.pdf', { type: 'application/pdf' });

		render(
			<Dropzone src={[file]}>
				<DropzoneContent />
			</Dropzone>,
		);

		expect(screen.getByText('report.pdf')).toBeInTheDocument();
		expect(screen.getByText('Drag and drop or click to replace')).toBeInTheDocument();
	});

	test('routes rejected files to onError instead of onDrop', async () => {
		const onDrop = vi.fn();
		const onError = vi.fn();

		render(
			<Dropzone accept={{ 'image/png': ['.png'] }} onDrop={onDrop} onError={onError}>
				<DropzoneEmptyState />
			</Dropzone>,
		);

		const input = document.querySelector('input[type="file"]');
		expect(input).not.toBeNull();
		if (!input) return;

		const rejectedFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
		fireEvent.change(input, { target: { files: [rejectedFile] } });

		await waitFor(() => {
			expect(onError).toHaveBeenCalledOnce();
		});
		expect(onDrop).not.toHaveBeenCalled();
	});
});
