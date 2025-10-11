import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { FormEngineBuilder } from '@/builder/form-engine-builder';
import type { ElementRegistration } from '@/types';

describe('Recursive Schema Handling', () => {
	describe('Self-Referential Schemas', () => {
		test('should handle nested comments without max call stack error', () => {
			type Comment = {
				__id: 'comment';
				text: string;
				author: string;
				replies?: Comment[];
			};

			const commentSchema: z.ZodType<Comment> = z.lazy(() =>
				z.object({
					__id: z.literal('comment'),
					text: z.string(),
					author: z.string(),
					replies: z.array(commentSchema).optional(),
				}),
			) as z.ZodType<Comment>;

			const commentReg: ElementRegistration = {
				__id: 'comment',
				schema: commentSchema,
				metadata: { name: 'Comment Thread', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(commentReg).build();

			expect(() => {
				const schema = engine.generateJSONSchemaCollection();
				expect(schema.schemas['element:comment']).toBeDefined();
			}).not.toThrow();
		});

		test('should handle tree structure without infinite recursion', () => {
			type TreeNode = {
				__id: 'tree-node';
				value: string;
				children?: TreeNode[];
			};

			const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
				z.object({
					__id: z.literal('tree-node'),
					value: z.string(),
					children: z.array(treeNodeSchema).optional(),
				}),
			) as z.ZodType<TreeNode>;

			const treeReg: ElementRegistration = {
				__id: 'tree-node',
				schema: treeNodeSchema,
				metadata: { name: 'Tree Node', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(treeReg).build();

			const schema = engine.generateJSONSchemaCollection();

			expect(schema.schemas['element:tree-node']).toBeDefined();
			expect(schema.schemas['element:tree-node']?.properties?.children).toBeDefined();
		});
	});

	describe('Mutual Recursion (User <-> Post pattern)', () => {
		test('should handle User-Post circular reference without max call stack error', () => {
			type User = {
				__id: 'user';
				name: string;
				posts?: Post[];
			};

			type Post = {
				__id: 'post';
				title: string;
				content: string;
				author?: User;
			};

			const userSchema: z.ZodType<User> = z.lazy(() =>
				z.object({
					__id: z.literal('user'),
					name: z.string(),
					posts: z.array(postSchema).optional(),
				}),
			) as z.ZodType<User>;

			const postSchema: z.ZodType<Post> = z.lazy(() =>
				z.object({
					__id: z.literal('post'),
					title: z.string(),
					content: z.string(),
					author: userSchema.optional(),
				}),
			) as z.ZodType<Post>;

			const userReg: ElementRegistration = {
				__id: 'user',
				schema: userSchema,
				metadata: { name: 'User', category: 'input' },
				render: () => null,
			};

			const postReg: ElementRegistration = {
				__id: 'post',
				schema: postSchema,
				metadata: { name: 'Post', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(userReg).addElement(postReg).build();

			expect(() => {
				const schema = engine.generateJSONSchemaCollection();
				expect(schema.schemas['element:user']).toBeDefined();
				expect(schema.schemas['element:post']).toBeDefined();
			}).not.toThrow();
		});

		test('should generate correct $ref for User-Post circular references', () => {
			type User = {
				__id: 'user';
				name: string;
				posts?: Post[];
			};

			type Post = {
				__id: 'post';
				title: string;
				content: string;
				author?: User;
			};

			const userSchema: z.ZodType<User> = z.lazy(() =>
				z.object({
					__id: z.literal('user'),
					name: z.string(),
					posts: z.array(postSchema).optional(),
				}),
			) as z.ZodType<User>;

			const postSchema: z.ZodType<Post> = z.lazy(() =>
				z.object({
					__id: z.literal('post'),
					title: z.string(),
					content: z.string(),
					author: userSchema.optional(),
				}),
			) as z.ZodType<Post>;

			const userReg: ElementRegistration = {
				__id: 'user',
				schema: userSchema,
				metadata: { name: 'User', category: 'input' },
				render: () => null,
			};

			const postReg: ElementRegistration = {
				__id: 'post',
				schema: postSchema,
				metadata: { name: 'Post', category: 'input' },
				render: () => null,
			};

			const engine = new FormEngineBuilder().addElement(userReg).addElement(postReg).build();

			const schema = engine.generateJSONSchemaCollection();

			console.log('\n=== User-Post Circular Reference ===');
			console.log(JSON.stringify(schema, null, 2));
			console.log('====================================\n');

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
				__id: 'organization';
				name: string;
				departments?: Department[];
			};

			type Department = {
				__id: 'department';
				name: string;
				teams?: Team[];
			};

			type Team = {
				__id: 'team';
				name: string;
				members?: Member[];
			};

			type Member = {
				__id: 'member';
				name: string;
				projects?: Project[];
			};

			type Project = {
				__id: 'project';
				name: string;
				organization?: Organization; 
			};

			const organizationSchema: z.ZodType<Organization> = z.lazy(() =>
				z.object({
					__id: z.literal('organization'),
					name: z.string(),
					departments: z.array(departmentSchema).optional(),
				}),
			) as z.ZodType<Organization>;

			const departmentSchema: z.ZodType<Department> = z.lazy(() =>
				z.object({
					__id: z.literal('department'),
					name: z.string(),
					teams: z.array(teamSchema).optional(),
				}),
			) as z.ZodType<Department>;

			const teamSchema: z.ZodType<Team> = z.lazy(() =>
				z.object({
					__id: z.literal('team'),
					name: z.string(),
					members: z.array(memberSchema).optional(),
				}),
			) as z.ZodType<Team>;

			const memberSchema: z.ZodType<Member> = z.lazy(() =>
				z.object({
					__id: z.literal('member'),
					name: z.string(),
					projects: z.array(projectSchema).optional(),
				}),
			) as z.ZodType<Member>;

			const projectSchema: z.ZodType<Project> = z.lazy(() =>
				z.object({
					__id: z.literal('project'),
					name: z.string(),
					organization: organizationSchema.optional(),
				}),
			) as z.ZodType<Project>;

			const engine = new FormEngineBuilder()
				.addElement({
					__id: 'organization',
					schema: organizationSchema,
					metadata: { name: 'Organization', category: 'input' },
					render: () => null,
				})
				.addElement({
					__id: 'department',
					schema: departmentSchema,
					metadata: { name: 'Department', category: 'input' },
					render: () => null,
				})
				.addElement({
					__id: 'team',
					schema: teamSchema,
					metadata: { name: 'Team', category: 'input' },
					render: () => null,
				})
				.addElement({
					__id: 'member',
					schema: memberSchema,
					metadata: { name: 'Member', category: 'input' },
					render: () => null,
				})
				.addElement({
					__id: 'project',
					schema: projectSchema,
					metadata: { name: 'Project', category: 'input' },
					render: () => null,
				})
				.build();

			const start = performance.now();
			const schema = engine.generateJSONSchemaCollection();
			const duration = performance.now() - start;

			console.log(`\nDeep nesting schema generation took: ${duration.toFixed(2)}ms\n`);

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
				__id: 'comment';
				text: string;
				replies?: Comment[];
			};

			const commentSchema: z.ZodType<Comment> = z.lazy(() =>
				z.object({
					__id: z.literal('comment'),
					text: z.string(),
					replies: z.array(commentSchema).optional(),
				}),
			) as z.ZodType<Comment>;

			const engine = new FormEngineBuilder()
				.addElement({
					__id: 'comment',
					schema: commentSchema,
					metadata: { name: 'Comment', category: 'input' },
					render: () => null,
				})
				.build();

			const configSchema = engine.generateFormConfigSchema();

			expect(configSchema.$id).toBe('form-config-schema');
			expect(configSchema.$defs['element:comment']).toBeDefined();
			expect(configSchema.properties.elements).toBeDefined();
		});
	});

	describe('Edge Cases', () => {
		test('should handle empty optional arrays in recursive schemas', () => {
			type Node = {
				__id: 'node';
				value: string;
				children?: Node[];
			};

			const nodeSchema: z.ZodType<Node> = z.lazy(() =>
				z.object({
					__id: z.literal('node'),
					value: z.string(),
					children: z.array(nodeSchema).optional(),
				}),
			) as z.ZodType<Node>;

			const engine = new FormEngineBuilder()
				.addElement({
					__id: 'node',
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
				__id: 'linked-node';
				value: string;
				next: LinkedNode | null;
			};

			const linkedNodeSchema: z.ZodType<LinkedNode> = z.lazy(() =>
				z.object({
					__id: z.literal('linked-node'),
					value: z.string(),
					next: z.union([linkedNodeSchema, z.null()]),
				}),
			) as z.ZodType<LinkedNode>;

			const engine = new FormEngineBuilder()
				.addElement({
					__id: 'linked-node',
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
