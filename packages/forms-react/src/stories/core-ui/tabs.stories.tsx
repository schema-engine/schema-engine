import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/core-ui/tabs';

const meta = {
	component: Tabs,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A tabs component for displaying multiple content panels.',
			},
		},
	},
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue="tab1">
			<TabsList>
				<TabsTrigger value="tab1">Tab 1</TabsTrigger>
				<TabsTrigger value="tab2">Tab 2</TabsTrigger>
				<TabsTrigger value="tab3">Tab 3</TabsTrigger>
			</TabsList>
			<TabsContent value="tab1">Content for tab 1</TabsContent>
			<TabsContent value="tab2">Content for tab 2</TabsContent>
			<TabsContent value="tab3">Content for tab 3</TabsContent>
		</Tabs>
	),
};

export const WithDescriptions: Story = {
	render: () => (
		<Tabs defaultValue="overview">
			<TabsList>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="details">Details</TabsTrigger>
				<TabsTrigger value="settings">Settings</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">
				<p className="text-sm text-muted-foreground">This is an overview of the content</p>
			</TabsContent>
			<TabsContent value="details">
				<p className="text-sm text-muted-foreground">Detailed information goes here</p>
			</TabsContent>
			<TabsContent value="settings">
				<p className="text-sm text-muted-foreground">Settings and configuration options</p>
			</TabsContent>
		</Tabs>
	),
};

export const ManyTabs: Story = {
	render: () => (
		<Tabs defaultValue="a">
			<TabsList className="w-full justify-start">
				<TabsTrigger value="a">A</TabsTrigger>
				<TabsTrigger value="b">B</TabsTrigger>
				<TabsTrigger value="c">C</TabsTrigger>
				<TabsTrigger value="d">D</TabsTrigger>
				<TabsTrigger value="e">E</TabsTrigger>
			</TabsList>
			<TabsContent value="a">Content A</TabsContent>
			<TabsContent value="b">Content B</TabsContent>
			<TabsContent value="c">Content C</TabsContent>
			<TabsContent value="d">Content D</TabsContent>
			<TabsContent value="e">Content E</TabsContent>
		</Tabs>
	),
};
