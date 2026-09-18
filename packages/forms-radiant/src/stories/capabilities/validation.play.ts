import { whenInteractive } from '@/stories/shared/storybook-ssr';
import { clickSubmit, expectFieldError, expectNoFieldError, playFieldFocusAndType } from '@/stories/shared/play';

export const clearsErrorsAfterValidInputPlay = whenInteractive(async ({ canvasElement }) => {
	await clickSubmit(canvasElement, /continue/i);
	await expectFieldError(canvasElement, /work email is required/i);
	await playFieldFocusAndType(canvasElement, /work email/i, 'name@example.com');
	await clickSubmit(canvasElement, /continue/i);
	await expectNoFieldError(canvasElement, /work email is required/i);
});

export const builtInRulesPlay = whenInteractive(async ({ canvasElement }) => {
	for (const [label, invalidValue, validValue, error] of [
		[/email address/i, 'not-an-email', 'name@example.com', /enter a valid email address/i],
		[/password/i, 'short', 'password1', /use at least 8 characters/i],
		[/team size/i, '0', '2', /at least one person is required/i],
		[/website url/i, 'not a URL', 'https://schema-engine.dev', /enter a valid url/i],
		[/server ipv4 address/i, '127.0.0.999', '127.0.0.1', /enter a valid ipv4 address/i],
	] as const) {
		await playFieldFocusAndType(canvasElement, label, invalidValue);
		await clickSubmit(canvasElement, /validate fields/i);
		await expectFieldError(canvasElement, error);
		await playFieldFocusAndType(canvasElement, label, validValue);
		await expectNoFieldError(canvasElement, error);
	}
});

export const formatRulesPlay = whenInteractive(async ({ canvasElement }) => {
	await clickSubmit(canvasElement, /validate formats/i);
	for (const error of [
		/uuid is required/i,
		/server ipv6 address is required/i,
		/json web token is required/i,
		/base64 value is required/i,
		/sha-256 hash is required/i,
		/cuid is required/i,
		/ulid is required/i,
		/hexadecimal value is required/i,
	]) {
		await expectFieldError(canvasElement, error);
	}
	for (const [label, invalidValue, validValue, error] of [
		[/uuid/i, 'not-a-uuid', '550e8400-e29b-41d4-a716-446655440000', /enter a valid uuid/i],
		[/server ipv6 address/i, 'not-an-ipv6', '2001:db8::1', /enter a valid ipv6 address/i],
		[/json web token/i, 'not-a-jwt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature', /enter a valid jwt/i],
		[/base64 value/i, 'not base64', 'aGVsbG8=', /enter base64 data/i],
		[
			/sha-256 hash/i,
			'not-a-hash',
			'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			/enter a valid sha-256 hash/i,
		],
		[/cuid/i, 'not-a-cuid', 'c1234567890abcdef1234567', /enter a valid cuid/i],
		[/ulid/i, 'not-a-ulid', '01ARZ3NDEKTSV4RRFFQ69G5FAV', /enter a valid ulid/i],
		[/hexadecimal value/i, 'not hexadecimal', 'deadbeef', /enter hexadecimal characters/i],
	] as const) {
		await playFieldFocusAndType(canvasElement, label, invalidValue);
		await clickSubmit(canvasElement, /validate formats/i);
		await expectFieldError(canvasElement, error);
		await playFieldFocusAndType(canvasElement, label, validValue);
		await expectNoFieldError(canvasElement, error);
	}
});

export const asyncUsernameAvailabilityPlay = whenInteractive(async ({ canvasElement }) => {
	await clickSubmit(canvasElement, /check availability/i);
	await expectFieldError(canvasElement, /username is required/i);
	await playFieldFocusAndType(canvasElement, /username/i, 'taken-user');
	await clickSubmit(canvasElement, /check availability/i);
	await expectFieldError(canvasElement, /that username is unavailable/i);
	await playFieldFocusAndType(canvasElement, /username/i, 'available-user');
	await expectNoFieldError(canvasElement, /that username is unavailable/i);
});
