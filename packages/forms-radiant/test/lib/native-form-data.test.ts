import { expect, test } from 'vitest';
import { nativeEntries, replaceFormData } from '@/lib/native-form-data';

test('names nested values with dots, rows of records with indexes and plain arrays by repeating the name', () => {
	expect(
		nativeEntries({
			name: 'Ada',
			address: { street: 'Main' },
			contacts: [{ email: 'a@x.co' }, { email: 'b@x.co' }],
			tags: ['a', 'b'],
			age: 3,
			agreed: true,
			skipped: null,
			missing: undefined,
		}),
	).toEqual([
		['name', 'Ada'],
		['address.street', 'Main'],
		['contacts.0.email', 'a@x.co'],
		['contacts.1.email', 'b@x.co'],
		['tags', 'a'],
		['tags', 'b'],
		['age', '3'],
		['agreed', 'true'],
	]);
});

test('sends each file as an entry of its own', () => {
	const file = new File(['x'], 'a.txt');
	expect(nativeEntries({ upload: [file, file] })).toEqual([
		['upload', file],
		['upload', file],
	]);
});

test('replaces everything the form held and keeps the entries it is told to', () => {
	const data = new FormData();
	data.append('stale', '1');
	data.append('name', 'old');
	replaceFormData(data, { name: 'Ada' }, [{ name: '_csrf', value: 'tok' }]);
	expect([...data.entries()]).toEqual([
		['name', 'Ada'],
		['_csrf', 'tok'],
	]);
});
