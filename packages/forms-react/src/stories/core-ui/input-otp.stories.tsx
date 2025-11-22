import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/core-ui/input-otp';
import { Label } from '@/components/core-ui/label';

const meta = {
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<InputOTP maxLength={6}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="space-y-2">
			<Label>Enter OTP</Label>
			<InputOTP maxLength={6}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
		</div>
	),
};

export const FourDigits: Story = {
	render: () => (
		<InputOTP maxLength={4}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
			</InputOTPGroup>
		</InputOTP>
	),
};
