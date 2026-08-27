import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets, rhfAdapter } from '@/stories/shared/form-builder.ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'File upload drop-zone element for single or multiple file uploads with validation rules. Supports drag-and-drop and click-to-upload. Base UI implementation.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={baseUIEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with drop-zone element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('dropzone-default')
			.setTitle('File Upload')
			.addStep({ id: 'step-1', title: 'Upload File' })
			.addElement('drop-zone', {
				id: 'file',
				name: 'file',
				label: 'Upload Document',
				maxFiles: 1,
			})
			.build(),
	},
};

export const MultipleFiles: Story = {
	args: {
		config: createForm()
			.setId('dropzone-multiple')
			.setTitle('Multiple Files Upload')
			.addStep({ id: 'step-1', title: 'Upload Files' })
			.addElement('drop-zone', {
				id: 'files',
				name: 'files',
				label: 'Upload Documents',
				maxFiles: 5,
				rules: [
					ValidationPresets.array.minItems(1, 'Upload at least one document'),
					ValidationPresets.array.maxItems(5, 'Maximum 5 documents allowed'),
				],
				description: 'You can upload up to 5 documents',
			})
			.build(),
	},
};

export const WithFileTypeRestriction: Story = {
	args: {
		config: createForm()
			.setId('dropzone-file-types')
			.setTitle('Image Upload')
			.addStep({ id: 'step-1', title: 'Upload Image' })
			.addElement('drop-zone', {
				id: 'image',
				name: 'image',
				label: 'Upload Image',
				maxFiles: 1,
				rules: [ValidationPresets.array.nonEmpty('Please upload an image')],
				accept: {
					'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
				},
				description: 'Accepted formats: JPEG, PNG, GIF, WebP',
			})
			.build(),
	},
};

export const WithSizeRestriction: Story = {
	args: {
		config: createForm()
			.setId('dropzone-size')
			.setTitle('File Size Restriction')
			.addStep({ id: 'step-1', title: 'Upload File' })
			.addElement('drop-zone', {
				id: 'document',
				name: 'document',
				label: 'Upload Document',
				maxFiles: 1,
				maxSize: 5 * 1024 * 1024,
				rules: [ValidationPresets.array.nonEmpty('Please upload a document')],
				accept: {
					'application/pdf': ['.pdf'],
					'application/msword': ['.doc', '.docx'],
				},
				description: 'Maximum file size: 5 MB. Accepted formats: PDF, DOC, DOCX',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('dropzone-validation')
			.setTitle('File Upload with Validation')
			.addStep({ id: 'step-1', title: 'Upload Required File' })
			.addElement('drop-zone', {
				id: 'attachment',
				name: 'attachment',
				label: 'Attachment',
				maxFiles: 1,
				rules: [ValidationPresets.array.nonEmpty('Please upload a file')],
				accept: {
					'application/pdf': ['.pdf'],
					'image/*': ['.jpeg', '.jpg', '.png'],
				},
				description: 'Upload a PDF or image file',
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

export const DocumentUpload: Story = {
	args: {
		config: createForm()
			.setId('dropzone-documents')
			.setTitle('Document Upload')
			.setDescription('Upload your required documents')
			.addStep({ id: 'step-1', title: 'Documents' })
			.addElement('drop-zone', {
				id: 'resume',
				name: 'resume',
				label: 'Resume',
				maxFiles: 1,
				rules: [ValidationPresets.array.nonEmpty('Resume is required')],
				accept: {
					'application/pdf': ['.pdf'],
					'application/msword': ['.doc', '.docx'],
				},
				description: 'PDF, DOC, or DOCX format',
			})
			.addElement('drop-zone', {
				id: 'coverLetter',
				name: 'coverLetter',
				label: 'Cover Letter',
				maxFiles: 1,
				accept: {
					'application/pdf': ['.pdf'],
					'application/msword': ['.doc', '.docx'],
				},
				description: 'Optional. PDF, DOC, or DOCX format',
			})
			.addElement('submit', { id: 'submit', label: 'Submit Application', name: 'submit' })
			.build(),
	},
};

export const ImageGallery: Story = {
	args: {
		config: createForm()
			.setId('dropzone-gallery')
			.setTitle('Image Gallery')
			.setDescription('Upload up to 10 images for your gallery')
			.addStep({ id: 'step-1', title: 'Images' })
			.addElement('drop-zone', {
				id: 'images',
				name: 'images',
				label: 'Gallery Images',
				maxFiles: 10,
				maxSize: 10 * 1024 * 1024,
				rules: [
					ValidationPresets.array.minItems(1, 'Upload at least one image'),
					ValidationPresets.array.maxItems(10, 'Maximum 10 images allowed'),
				],
				accept: {
					'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
				},
				description: 'Maximum 10 images, up to 10 MB each. Supported: JPEG, PNG, WebP',
			})
			.addElement('submit', { id: 'submit', label: 'Upload Gallery', name: 'submit' })
			.build(),
	},
};
export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('dropzone-disabled')
			.setTitle('Disabled Drop-Zone')
			.addStep({ id: 'step-1', title: 'Disabled Upload' })
			.addElement('drop-zone', {
				id: 'disabledFile',
				name: 'disabledFile',
				label: 'Upload (Disabled)',
				maxFiles: 1,
				disabled: true,
				description: 'This field is currently disabled',
			})
			.build(),
	},
};
