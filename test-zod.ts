import { z } from "zod";

// Test basic methods
console.log("Testing Zod 4 API:");

// Test email
try {
	const emailSchema = z.string().email();
	console.log("✓ email() works");

	// Test with custom pattern
	try {
		const emailWithPattern = z.string().email({ pattern: /test@.*/ });
		console.log("✓ email({ pattern }) works");
	} catch (e) {
		console.log("✗ email({ pattern }) not supported");
	}
} catch (e) {
	console.log("✗ email() not supported");
}

// Test url
try {
	const urlSchema = z.string().url();
	console.log("✓ url() works");

	try {
		const urlWithOptions = z.string().url({ protocol: /https/ });
		console.log("✓ url({ protocol }) works");
	} catch (e) {
		console.log("✗ url({ protocol }) not supported");
	}
} catch (e) {
	console.log("✗ url() not supported");
}

// Test uuid
try {
	const uuidSchema = z.string().uuid();
	console.log("✓ uuid() works");

	try {
		const uuidV4 = z.string().uuid({ version: "v4" });
		console.log("✓ uuid({ version }) works");
	} catch (e) {
		console.log("✗ uuid({ version }) not supported");
	}
} catch (e) {
	console.log("✗ uuid() not supported");
}

// Test datetime
try {
	const datetimeSchema = z.string().datetime();
	console.log("✓ datetime() works");

	try {
		const datetimeWithOffset = z.string().datetime({ offset: true });
		console.log("✓ datetime({ offset }) works");
	} catch (e) {
		console.log("✗ datetime({ offset }) not supported");
	}
} catch (e) {
	console.log("✗ datetime() not supported");
}

// Test newer methods
try {
	const dateSchema = z.string().date();
	console.log("✓ date() works");
} catch (e) {
	console.log("✗ date() not supported");
}

try {
	const timeSchema = z.string().time();
	console.log("✓ time() works");
} catch (e) {
	console.log("✗ time() not supported");
}

try {
	const ipv4Schema = z.string().ipv4();
	console.log("✓ ipv4() works");
} catch (e) {
	console.log("✗ ipv4() not supported");
}

try {
	const base64Schema = z.string().base64();
	console.log("✓ base64() works");
} catch (e) {
	console.log("✗ base64() not supported");
}

try {
	const emojiSchema = z.string().emoji();
	console.log("✓ emoji() works");
} catch (e) {
	console.log("✗ emoji() not supported");
}

try {
	const hexSchema = z.string().hex();
	console.log("✓ hex() works");
} catch (e) {
	console.log("✗ hex() not supported");
}

// Test static methods
try {
	const emailStatic = z.email();
	console.log("✓ z.email() works");
} catch (e) {
	console.log("✗ z.email() not supported");
}

try {
	const uuidStatic = z.uuid();
	console.log("✓ z.uuid() works");
} catch (e) {
	console.log("✗ z.uuid() not supported");
}

try {
	const urlStatic = z.url();
	console.log("✓ z.url() works");
} catch (e) {
	console.log("✗ z.url() not supported");
}
