import { describe, test, expect } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
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

			const commentSchema: z.ZodMiniType<Comment> = z.lazy(() =>
				z.object({
					$type: z.literal('comment'),
					text: z.string(),
					author: z.string(),
					replies: z.optional(z.array(commentSchema)),
				}),
			) as z.ZodMiniType<Comment>;

			const commentReg: StaticRegistration = {
				$type: 'comment',
				schema: commentSchema,
				metadata: { name: 'Comment Thread', category: 'input' },
				render: () => null,
			};

			const engine = createFormEngine({ elements: [commentReg] });

			const schema = engine.generateJSONSchemaCollection();
			expect(schema.schemas['element:comment']?.type).toBe('object');
		});

		test('should handle tree structure without infinite recursion', () => {
			type TreeNode = {
				$type: 'tree-node';
				value: string;
				children?: TreeNode[];
			};

			const treeNodeSchema: z.ZodMiniType<TreeNode> = z.lazy(() =>
				z.object({
					$type: z.literal('tree-node'),
					value: z.string(),
					children: z.optional(z.array(treeNodeSchema)),
				}),
			) as z.ZodMiniType<TreeNode>;

			const treeReg: StaticRegistration = {
				$type: 'tree-node',
				schema: treeNodeSchema,
				metadata: { name: 'Tree Node', category: 'input' },
				render: () => null,
			};

			const engine = createFormEngine({ elements: [treeReg] });

			const schema = engine.generateJSONSchemaCollection();
			expect(schema.schemas['element:tree-node']?.type).toBe('object');
			expect(schema.schemas['element:tree-node']?.properties?.children).toMatchObject({ type: 'array' });
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

			const userSchema: z.ZodMiniType<User> = z.lazy(() =>
				z.object({
					$type: z.literal('user'),
					name: z.string(),
					posts: z.optional(z.array(postSchema)),
				}),
			) as z.ZodMiniType<User>;

			const postSchema: z.ZodMiniType<Post> = z.lazy(() =>
				z.object({
					$type: z.literal('post'),
					title: z.string(),
					content: z.string(),
					author: z.optional(userSchema),
				}),
			) as z.ZodMiniType<Post>;

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

			const engine = createFormEngine({ elements: [userReg, postReg] });

			const schema = engine.generateJSONSchemaCollection();
			expect(schema.schemas['element:user']?.type).toBe('object');
			expect(schema.schemas['element:post']?.type).toBe('object');
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

			const userSchema: z.ZodMiniType<User> = z.lazy(() =>
				z.object({
					$type: z.literal('user'),
					name: z.string(),
					posts: z.optional(z.array(postSchema)),
				}),
			) as z.ZodMiniType<User>;

			const postSchema: z.ZodMiniType<Post> = z.lazy(() =>
				z.object({
					$type: z.literal('post'),
					title: z.string(),
					content: z.string(),
					author: z.optional(userSchema),
				}),
			) as z.ZodMiniType<Post>;

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

			const engine = createFormEngine({ elements: [userReg, postReg] });

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:user']?.type).toBe('object');
			expect(schema.schemas['element:post']?.type).toBe('object');

			const userSchema_generated = schema.schemas['element:user'];
			expect(userSchema_generated?.properties?.posts).toMatchObject({ type: 'array' });

			const postSchema_generated = schema.schemas['element:post'];
			expect(postSchema_generated?.properties?.author).toMatchObject({ $ref: '#/definitions/element:user' });
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

			const organizationSchema: z.ZodMiniType<Organization> = z.lazy(() =>
				z.object({
					$type: z.literal('organization'),
					name: z.string(),
					departments: z.optional(z.array(departmentSchema)),
				}),
			) as z.ZodMiniType<Organization>;

			const departmentSchema: z.ZodMiniType<Department> = z.lazy(() =>
				z.object({
					$type: z.literal('department'),
					name: z.string(),
					teams: z.optional(z.array(teamSchema)),
				}),
			) as z.ZodMiniType<Department>;

			const teamSchema: z.ZodMiniType<Team> = z.lazy(() =>
				z.object({
					$type: z.literal('team'),
					name: z.string(),
					members: z.optional(z.array(memberSchema)),
				}),
			) as z.ZodMiniType<Team>;

			const memberSchema: z.ZodMiniType<Member> = z.lazy(() =>
				z.object({
					$type: z.literal('member'),
					name: z.string(),
					projects: z.optional(z.array(projectSchema)),
				}),
			) as z.ZodMiniType<Member>;

			const projectSchema: z.ZodMiniType<Project> = z.lazy(() =>
				z.object({
					$type: z.literal('project'),
					name: z.string(),
					organization: z.optional(organizationSchema),
				}),
			) as z.ZodMiniType<Project>;

			const engine = createFormEngine({
				elements: [
					{
						$type: 'organization',
						schema: organizationSchema,
						metadata: { name: 'Organization', category: 'input' },
						render: () => null,
					},
					{
						$type: 'department',
						schema: departmentSchema,
						metadata: { name: 'Department', category: 'input' },
						render: () => null,
					},
					{
						$type: 'team',
						schema: teamSchema,
						metadata: { name: 'Team', category: 'input' },
						render: () => null,
					},
					{
						$type: 'member',
						schema: memberSchema,
						metadata: { name: 'Member', category: 'input' },
						render: () => null,
					},
					{
						$type: 'project',
						schema: projectSchema,
						metadata: { name: 'Project', category: 'input' },
						render: () => null,
					},
				],
			});

			const start = performance.now();
			const schema = engine.generateJSONSchemaCollection();
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(1000);

			for (const key of ['organization', 'department', 'team', 'member', 'project'] as const) {
				expect(schema.schemas[`element:${key}`]?.type).toBe('object');
			}
		});
	});

	describe('Form Config Schema with Recursive Elements', () => {
		test('should generate form config schema with recursive elements', () => {
			type Comment = {
				$type: 'comment';
				text: string;
				replies?: Comment[];
			};

			const commentSchema: z.ZodMiniType<Comment> = z.lazy(() =>
				z.object({
					$type: z.literal('comment'),
					text: z.string(),
					replies: z.optional(z.array(commentSchema)),
				}),
			) as z.ZodMiniType<Comment>;

			const engine = createFormEngine({
				elements: [
					{
						$type: 'comment',
						schema: commentSchema,
						metadata: { name: 'Comment', category: 'input' },
						render: () => null,
					},
				],
			});

			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.$id).toBe('form-config-schema');
			expect(configSchema.$defs['element:comment']?.type).toBe('object');
			expect(configSchema.properties.steps?.type).toBe('array');
		});
	});

	describe('Edge Cases', () => {
		test('should handle empty optional arrays in recursive schemas', () => {
			type Node = {
				$type: 'node';
				value: string;
				children?: Node[];
			};

			const nodeSchema: z.ZodMiniType<Node> = z.lazy(() =>
				z.object({
					$type: z.literal('node'),
					value: z.string(),
					children: z.optional(z.array(nodeSchema)),
				}),
			) as z.ZodMiniType<Node>;

			const engine = createFormEngine({
				elements: [
					{
						$type: 'node',
						schema: nodeSchema,
						metadata: { name: 'Node', category: 'input' },
						render: () => null,
					},
				],
			});

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:node']?.type).toBe('object');
			expect(schema.schemas['element:node']?.properties?.children).toMatchObject({ type: 'array' });
		});

		test('should handle nullable recursive references', () => {
			type LinkedNode = {
				$type: 'linked-node';
				value: string;
				next: LinkedNode | null;
			};

			const linkedNodeSchema: z.ZodMiniType<LinkedNode> = z.lazy(() =>
				z.object({
					$type: z.literal('linked-node'),
					value: z.string(),
					next: z.union([linkedNodeSchema, z.null()]),
				}),
			) as z.ZodMiniType<LinkedNode>;

			const engine = createFormEngine({
				elements: [
					{
						$type: 'linked-node',
						schema: linkedNodeSchema,
						metadata: { name: 'Linked Node', category: 'input' },
						render: () => null,
					},
				],
			});

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:linked-node']?.type).toBe('object');
			expect(schema.schemas['element:linked-node']?.properties?.next).toMatchObject({
				anyOf: [{ $ref: '#/definitions/element:linked-node' }, { type: 'null' }],
			});
		});
	});
});
