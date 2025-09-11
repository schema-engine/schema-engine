import { test, expect, describe } from 'bun:test';
import {
	ValidationPresets,
	createZodSchema,
	generateFormSchema,
	defaultValidationRegistry,
	type EmailRule,
	type UrlRule,
	type UuidRule,
	type DateTimeRule,
	type DateRule,
	type TimeRule,
	type IpRule,
	type CidrRule,
	type JwtRule,
	type HashRule,
	type Base64Rule,
	type StringFormatRule,
} from '@/lib/form-engine/validation';

describe('Validation', () => {
	describe('ValidationPresets', () => {
		test('should generate required rule', () => {
			const rule = ValidationPresets.required();
			expect(rule.type).toBe('required');
		});
		test('should generate email rule', () => {
			const rule = ValidationPresets.email();
			expect(rule.type).toBe('email');
		});
		test('should generate minLength rule', () => {
			const rule = ValidationPresets.minLength(3);
			expect(rule.type).toBe('minLength');
			expect(rule.value).toBe(3);
		});
		test('should generate maxLength rule', () => {
			const rule = ValidationPresets.maxLength(10);
			expect(rule.type).toBe('maxLength');
			expect(rule.value).toBe(10);
		});
		test('should generate min rule', () => {
			const rule = ValidationPresets.min(1);
			expect(rule.type).toBe('min');
			expect(rule.value).toBe(1);
		});
		test('should generate max rule', () => {
			const rule = ValidationPresets.max(100);
			expect(rule.type).toBe('max');
			expect(rule.value).toBe(100);
		});
		test('should generate pattern rule', () => {
			const rule = ValidationPresets.pattern('^abc$');
			expect(rule.type).toBe('pattern');
			expect(rule.value).toBe('^abc$');
		});
	});

	describe('createZodSchema', () => {
		test('should create required string schema', () => {
			const rules = [ValidationPresets.required()];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
		
		test('should create minLength string schema', () => {
			const rules = [ValidationPresets.minLength(3)];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('ab')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
		
		test('should create maxLength string schema', () => {
			const rules = [ValidationPresets.maxLength(5)];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('abcdef')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
		
		test('should create min/max number schema', () => {
			const rules = [ValidationPresets.min(1), ValidationPresets.max(10)];
			const schema = createZodSchema('number', rules);
			expect(() => schema.parse(0)).toThrow();
			expect(() => schema.parse(11)).toThrow();
			expect(schema.parse(5)).toBe(5);
		});
		
		test('should create pattern string schema', () => {
			const rules = [ValidationPresets.pattern('^abc$')];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('def')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});

		test('should create email schema', () => {
			const emailRule: EmailRule = { type: 'email' };
			const schema = createZodSchema('string', [emailRule]);
			expect(() => schema.parse('invalid-email')).toThrow();
			expect(schema.parse('test@example.com')).toBe('test@example.com');
		});

		test('should create URL schema', () => {
			const urlRule: UrlRule = { type: 'url' };
			const schema = createZodSchema('string', [urlRule]);
			expect(() => schema.parse('not-a-url')).toThrow();
			expect(schema.parse('https://example.com')).toBe('https://example.com');
		});

		test('should create UUID schema', () => {
			const uuidRule: UuidRule = { type: 'uuid' };
			const schema = createZodSchema('string', [uuidRule]);
			expect(() => schema.parse('not-a-uuid')).toThrow();
			expect(schema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
		});

		test('should create UUID schema with version', () => {
			const uuidRule: UuidRule = { type: 'uuid', version: 'v4' };
			const schema = createZodSchema('string', [uuidRule]);
			expect(() => schema.parse('not-a-uuid')).toThrow();
			expect(schema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
		});

		test('should create ISO datetime schema', () => {
			const datetimeRule: DateTimeRule = { type: 'datetime' };
			const schema = createZodSchema('string', [datetimeRule]);
			expect(() => schema.parse('not-a-datetime')).toThrow();
			expect(schema.parse('2023-01-01T00:00:00Z')).toBe('2023-01-01T00:00:00Z');
		});

		test('should create ISO date schema', () => {
			const dateRule: DateRule = { type: 'date' };
			const schema = createZodSchema('string', [dateRule]);
			expect(() => schema.parse('not-a-date')).toThrow();
			expect(schema.parse('2023-01-01')).toBe('2023-01-01');
		});

		test('should create ISO time schema', () => {
			const timeRule: TimeRule = { type: 'time' };
			const schema = createZodSchema('string', [timeRule]);
			expect(() => schema.parse('not-a-time')).toThrow();
			expect(schema.parse('14:30:00')).toBe('14:30:00');
		});

		test('should create IPv4 schema', () => {
			const ipRule: IpRule = { type: 'ip', version: 'v4' };
			const schema = createZodSchema('string', [ipRule]);
			expect(() => schema.parse('not-an-ip')).toThrow();
			expect(schema.parse('192.168.1.1')).toBe('192.168.1.1');
		});

		test('should create IPv6 schema', () => {
			const ipRule: IpRule = { type: 'ip', version: 'v6' };
			const schema = createZodSchema('string', [ipRule]);
			expect(() => schema.parse('not-an-ip')).toThrow();
			expect(schema.parse('2001:db8::1')).toBe('2001:db8::1');
		});

		test('should create CIDR v4 schema', () => {
			const cidrRule: CidrRule = { type: 'cidr', version: 'v4' };
			const schema = createZodSchema('string', [cidrRule]);
			expect(() => schema.parse('not-a-cidr')).toThrow();
			expect(schema.parse('192.168.1.0/24')).toBe('192.168.1.0/24');
		});

		test('should create CIDR v6 schema', () => {
			const cidrRule: CidrRule = { type: 'cidr', version: 'v6' };
			const schema = createZodSchema('string', [cidrRule]);
			expect(() => schema.parse('not-a-cidr')).toThrow();
			expect(schema.parse('2001:db8::/32')).toBe('2001:db8::/32');
		});

		test('should create JWT schema', () => {
			const jwtRule: JwtRule = { type: 'jwt' };
			const schema = createZodSchema('string', [jwtRule]);
			expect(() => schema.parse('not-a-jwt')).toThrow();
			// Valid JWT structure (header.payload.signature)
			expect(schema.parse('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
		});

		test('should create hash schema', () => {
			const hashRule: HashRule = { type: 'hash', algorithm: 'sha256' };
			const schema = createZodSchema('string', [hashRule]);
			expect(() => schema.parse('not-a-hash')).toThrow();
			expect(schema.parse('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
		});

		test('should create base64 schema', () => {
			const base64Rule: Base64Rule = { type: 'base64' };
			const schema = createZodSchema('string', [base64Rule]);
			expect(() => schema.parse('not-base64!@#')).toThrow();
			expect(schema.parse('SGVsbG8gV29ybGQ=')).toBe('SGVsbG8gV29ybGQ=');
		});

		test('should create base64url schema', () => {
			const base64urlRule: Base64Rule = { type: 'base64', variant: 'url' };
			const schema = createZodSchema('string', [base64urlRule]);
			expect(() => schema.parse('not-base64url!@#')).toThrow();
			expect(schema.parse('SGVsbG8gV29ybGQ')).toBe('SGVsbG8gV29ybGQ');
		});

		test('should create emoji format schema', () => {
			const emojiRule: StringFormatRule = { type: 'format', format: 'emoji' };
			const schema = createZodSchema('string', [emojiRule]);
			expect(() => schema.parse('not-an-emoji')).toThrow();
			expect(schema.parse('😀')).toBe('😀');
		});

		test('should create hex format schema', () => {
			const hexRule: StringFormatRule = { type: 'format', format: 'hex' };
			const schema = createZodSchema('string', [hexRule]);
			expect(() => schema.parse('not-hex-gggg')).toThrow();
			expect(schema.parse('1a2b3c')).toBe('1a2b3c');
		});

		test('should create nanoid format schema', () => {
			const nanoidRule: StringFormatRule = { type: 'format', format: 'nanoid' };
			const schema = createZodSchema('string', [nanoidRule]);
			expect(() => schema.parse('not-a-nanoid')).toThrow();
			expect(schema.parse('V1StGXR8_Z5jdHi6B-myT')).toBe('V1StGXR8_Z5jdHi6B-myT');
		});

		test('should create cuid format schema', () => {
			const cuidRule: StringFormatRule = { type: 'format', format: 'cuid' };
			const schema = createZodSchema('string', [cuidRule]);
			expect(() => schema.parse('not-a-cuid')).toThrow();
			expect(schema.parse('cjld2cjxh0000qzrmn831i7rn')).toBe('cjld2cjxh0000qzrmn831i7rn');
		});

		test('should create ulid format schema', () => {
			const ulidRule: StringFormatRule = { type: 'format', format: 'ulid' };
			const schema = createZodSchema('string', [ulidRule]);
			expect(() => schema.parse('not-a-ulid')).toThrow();
			expect(schema.parse('01F8MECHZX3TBDSZ7XRADM79XZ')).toBe('01F8MECHZX3TBDSZ7XRADM79XZ');
		});
	});

	describe('generateFormSchema', () => {
		test('should generate schema for multiple fields', () => {
			const fields = [
				{ name: 'username', type: 'input', validation: [ValidationPresets.required()] },
				{ name: 'age', type: 'number', validation: [ValidationPresets.min(18)] },
			];
			const schema = generateFormSchema(fields);
			expect(() => schema.parse({ username: '', age: 17 })).toThrow();
			expect(schema.parse({ username: 'user', age: 18 })).toEqual({ username: 'user', age: 18 });
		});
	});

	describe('defaultValidationRegistry', () => {
		test('should register and get custom validator', () => {
			defaultValidationRegistry.register('isFoo', (value) => value === 'foo');
			const validator = defaultValidationRegistry.get('isFoo');
			expect(typeof validator).toBe('function');
			if (validator) {
				expect(validator('foo')).toBe(true);
				expect(validator('bar')).toBe(false);
			}
		});
		test('should check if validator exists', () => {
			defaultValidationRegistry.register('isBar', (value) => value === 'bar');
			expect(defaultValidationRegistry.has('isBar')).toBe(true);
			expect(defaultValidationRegistry.has('notExist')).toBe(false);
		});
	});
});
