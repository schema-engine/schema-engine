import { loadDocument } from './client';
import { useLocalServer } from './local-network.helper';

const where = (path: ReadonlyArray<PropertyKey | { key: PropertyKey }> = []) =>
	path.map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment))).join('.');

useLocalServer();

const result = await loadDocument('https://shop.example/orders/1042');

if (!result.success) console.log(result.error);
else {
	for (const line of result.html) console.log(line);
	for (const issue of result.issues) console.log(`issue ${where(issue.path)}: ${issue.message}`);
}
