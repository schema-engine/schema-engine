import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { FormComposer } from '@/builder/form-composer';
import type { StaticRegistration } from '@/types';

describe('Recursive Schema Handling', () => {
	describe('Self-Referential Schemas', () => {
		test('should handle nested comments without max call stack error', () => {
			type Comment = {
				$type: 'comment';
				text: string;
				author: string;
				replies?: Comment[];
			};

			const commentSchema: z.ZodType<Comment> = z.lazy(() =>
				z.object({
					$type: z.literal('comment'),
					text: z.string(),
					author: z.string(),
					replies: z.array(commentSchema).optional(),
				}),
			) as z.ZodType<Comment>;

			const commentReg: StaticRegistration = {
				$type: 'comment',
				schema: commentSchema,
				metadata: { name: 'Comment Thread', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(commentReg).build();

			expect(() => {
				const schema = engine.generateJSONSchemaCollection();
				expect(schema.schemas['element:comment']).toBeDefined();
			}).not.toThrow();
		});

		test('should handle tree structure without infinite recursion', () => {
			type TreeNode = {
				$type: 'tree-node';
				value: string;
				children?: TreeNode[];
			};

			const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
				z.object({
					$type: z.literal('tree-node'),
					value: z.string(),
					children: z.array(treeNodeSchema).optional(),
				}),
			) as z.ZodType<TreeNode>;

			const treeReg: StaticRegistration = {
				$type: 'tree-node',
				schema: treeNodeSchema,
				metadata: { name: 'Tree Node', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(treeReg).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:tree-node']).toBeDefined();
			expect(schema.schemas['element:tree-node']?.properties?.children).toBeDefined();
		});
	});

	describe('Mutual Recursion (User <-> Post pattern)', () => {
		test('should handle User-Post circular reference without max call stack error', () => {
			type User = {
				$type: 'user';
				name: string;
				posts?: Post[];
			};

			type Post = {
				$type: 'post';
				title: string;
				content: string;
				author?: User;
			};

			const userSchema: z.ZodType<User> = z.lazy(() =>
				z.object({
					$type: z.literal('user'),
					name: z.string(),
					posts: z.array(postSchema).optional(),
				}),
			) as z.ZodType<User>;

			const postSchema: z.ZodType<Post> = z.lazy(() =>
				z.object({
					$type: z.literal('post'),
					title: z.string(),
					content: z.string(),
					author: userSchema.optional(),
				}),
			) as z.ZodType<Post>;

			const userReg: StaticRegistration = {
				$type: 'user',
				schema: userSchema,
				metadata: { name: 'User', category: 'input' },
				render: () => null,
			};

			const postReg: StaticRegistration = {
				$type: 'post',
				schema: postSchema,
				metadata: { name: 'Post', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(userReg).addElement(postReg).build();

			expect(() => {
				const schema = engine.generateJSONSchemaCollection();
				expect(schema.schemas['element:user']).toBeDefined();
				expect(schema.schemas['element:post']).toBeDefined();
			}).not.toThrow();
		});

		test('should generate correct $ref for User-Post circular references', () => {
			type User = {
				$type: 'user';
				name: string;
				posts?: Post[];
			};

			type Post = {
				$type: 'post';
				title: string;
				content: string;
				author?: User;
			};

			const userSchema: z.ZodType<User> = z.lazy(() =>
				z.object({
					$type: z.literal('user'),
					name: z.string(),
					posts: z.array(postSchema).optional(),
				}),
			) as z.ZodType<User>;

			const postSchema: z.ZodType<Post> = z.lazy(() =>
				z.object({
					$type: z.literal('post'),
					title: z.string(),
					content: z.string(),
					author: userSchema.optional(),
				}),
			) as z.ZodType<Post>;

			const userReg: StaticRegistration = {
				$type: 'user',
				schema: userSchema,
				metadata: { name: 'User', category: 'input' },
				render: () => null,
			};

			const postReg: StaticRegistration = {
				$type: 'post',
				schema: postSchema,
				metadata: { name: 'Post', category: 'input' },
				render: () => null,
			};

			const engine = new FormComposer().addElement(userReg).addElement(postReg).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:user']).toBeDefined();
			expect(schema.schemas['element:post']).toBeDefined();

			const userSchema_generated = schema.schemas['element:user'];
			expect(userSchema_generated?.properties?.posts).toBeDefined();

			const postSchema_generated = schema.schemas['element:post'];
			expect(postSchema_generated?.properties?.author).toBeDefined();
		});
	});

	describe('Deep Nesting', () => {
		test('should handle deeply nested schemas without performance issues', () => {
			type Organization = {
				$type: 'organization';
				name: string;
				departments?: Department[];
			};

			type Department = {
				$type: 'department';
				name: string;
				teams?: Team[];
			};

			type Team = {
				$type: 'team';
				name: string;
				members?: Member[];
			};

			type Member = {
				$type: 'member';
				name: string;
				projects?: Project[];
			};

			type Project = {
				$type: 'project';
				name: string;
				organization?: Organization;
			};

			const organizationSchema: z.ZodType<Organization> = z.lazy(() =>
				z.object({
					$type: z.literal('organization'),
					name: z.string(),
					departments: z.array(departmentSchema).optional(),
				}),
			) as z.ZodType<Organization>;

			const departmentSchema: z.ZodType<Department> = z.lazy(() =>
				z.object({
					$type: z.literal('department'),
					name: z.string(),
					teams: z.array(teamSchema).optional(),
				}),
			) as z.ZodType<Department>;

			const teamSchema: z.ZodType<Team> = z.lazy(() =>
				z.object({
					$type: z.literal('team'),
					name: z.string(),
					members: z.array(memberSchema).optional(),
				}),
			) as z.ZodType<Team>;

			const memberSchema: z.ZodType<Member> = z.lazy(() =>
				z.object({
					$type: z.literal('member'),
					name: z.string(),
					projects: z.array(projectSchema).optional(),
				}),
			) as z.ZodType<Member>;

			const projectSchema: z.ZodType<Project> = z.lazy(() =>
				z.object({
					$type: z.literal('project'),
					name: z.string(),
					organization: organizationSchema.optional(),
				}),
			) as z.ZodType<Project>;

			const engine = new FormComposer()
				.addElement({
					$type: 'organization',
					schema: organizationSchema,
					metadata: { name: 'Organization', category: 'input' },
					render: () => null,
				})
				.addElement({
					$type: 'department',
					schema: departmentSchema,
					metadata: { name: 'Department', category: 'input' },
					render: () => null,
				})
				.addElement({
					$type: 'team',
					schema: teamSchema,
					metadata: { name: 'Team', category: 'input' },
					render: () => null,
				})
				.addElement({
					$type: 'member',
					schema: memberSchema,
					metadata: { name: 'Member', category: 'input' },
					render: () => null,
				})
				.addElement({
					$type: 'project',
					schema: projectSchema,
					metadata: { name: 'Project', category: 'input' },
					render: () => null,
				})
				.build();

			const start = performance.now();
			const schema = engine.generateJSONSchemaCollection();
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(1000);

			expect(schema.schemas['element:organization']).toBeDefined();
			expect(schema.schemas['element:department']).toBeDefined();
			expect(schema.schemas['element:team']).toBeDefined();
			expect(schema.schemas['element:member']).toBeDefined();
			expect(schema.schemas['element:project']).toBeDefined();
		});
	});

	describe('Form Config Schema with Recursive Elements', () => {
		test('should generate form config schema with recursive elements', () => {
			type Comment = {
				$type: 'comment';
				text: string;
				replies?: Comment[];
			};

			const commentSchema: z.ZodType<Comment> = z.lazy(() =>
				z.object({
					$type: z.literal('comment'),
					text: z.string(),
					replies: z.array(commentSchema).optional(),
				}),
			) as z.ZodType<Comment>;

			const engine = new FormComposer()
				.addElement({
					$type: 'comment',
					schema: commentSchema,
					metadata: { name: 'Comment', category: 'input' },
					render: () => null,
				})
				.build();

			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.$id).toBe('form-config-schema');
			expect(configSchema.$defs['element:comment']).toBeDefined();
			expect(configSchema.properties.steps).toBeDefined();
		});
	});

	describe('Edge Cases', () => {
		test('should handle empty optional arrays in recursive schemas', () => {
			type Node = {
				$type: 'node';
				value: string;
				children?: Node[];
			};

			const nodeSchema: z.ZodType<Node> = z.lazy(() =>
				z.object({
					$type: z.literal('node'),
					value: z.string(),
					children: z.array(nodeSchema).optional(),
				}),
			) as z.ZodType<Node>;

			const engine = new FormComposer()
				.addElement({
					$type: 'node',
					schema: nodeSchema,
					metadata: { name: 'Node', category: 'input' },
					render: () => null,
				})
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:node']).toBeDefined();
			expect(schema.schemas['element:node']?.properties?.children).toBeDefined();
		});

		test('should handle nullable recursive references', () => {
			type LinkedNode = {
				$type: 'linked-node';
				value: string;
				next: LinkedNode | null;
			};

			const linkedNodeSchema: z.ZodType<LinkedNode> = z.lazy(() =>
				z.object({
					$type: z.literal('linked-node'),
					value: z.string(),
					next: z.union([linkedNodeSchema, z.null()]),
				}),
			) as z.ZodType<LinkedNode>;

			const engine = new FormComposer()
				.addElement({
					$type: 'linked-node',
					schema: linkedNodeSchema,
					metadata: { name: 'Linked Node', category: 'input' },
					render: () => null,
				})
				.build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:linked-node']).toBeDefined();
			expect(schema.schemas['element:linked-node']?.properties?.next).toBeDefined();
		});
	});
});
