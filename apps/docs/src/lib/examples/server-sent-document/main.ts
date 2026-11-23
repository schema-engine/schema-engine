import { loadDocument } from './client';
import { GET } from './server';

const where = (path: ReadonlyArray<PropertyKey | { key: PropertyKey }> = []) =>
	path.map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment))).join('.');

const result = await loadDocument('https://shop.example/orders/1042', async (url, init) => GET(new Request(url, init)));

if (!result.success) console.log(result.error);
else {
	for (const line of result.html) console.log(line);
	for (const issue of result.issues) console.log(`issue ${where(issue.path)}: ${issue.message}`);
}
