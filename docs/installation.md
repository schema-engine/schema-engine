# Installation & Setup

> ⚠️ **Work in Progress** - Form Engine is currently in active development and has not been published to npm yet. The API is stabilizing but may still have breaking changes before the first stable release.

## Current Status

Form Engine is being developed in the open and is used in production by several projects, but it's not yet packaged for general distribution. We're working toward a v1.0 release that will include:

- 📦 **NPM Package**: Easy installation via package managers
- 📚 **Complete Documentation**: Comprehensive guides and API reference
- 🧪 **Stable API**: No more breaking changes after v1.0
- 🎯 **TypeScript Support**: Full type definitions and IDE support
- 🚀 **Performance Optimizations**: Battle-tested and optimized
- 🛠️ **Developer Tools**: Debug helpers and development experience improvements

## Try It Now (Development Setup)

Want to explore Form Engine before the official release? You can set up the development environment and experiment with all the features:

### Prerequisites

- **Node.js 18+** (we recommend using [fnm](https://github.com/Schniz/fnm) for Node version management)
- **Bun** as the JavaScript runtime ([installation guide](https://bun.sh/docs/installation))

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/andeeplus/form-engine.git
cd form-engine

# Install dependencies
bun install

# Start the development server
bun dev
```

This will start the development server with live examples and documentation at `http://localhost:3000`.

### Explore the Examples

The development server includes comprehensive examples of Form Engine in action:

- **Basic Forms**: Simple contact forms and registration flows
- **Advanced Features**: Multi-step wizards, conditional logic, array fields
- **Action System**: Auto-save, notifications, analytics integration
- **Custom Components**: How to integrate your existing component library
- **Complex Scenarios**: Real-world form implementations

Browse to `http://localhost:3000/demo` to see all available examples.

### Project Structure

```
form-engine/
├── src/lib/form-engine/          # Core library code
│   ├── components/               # Built-in form components
│   ├── actions/                  # Action system
│   ├── hooks/                    # React hooks
│   └── types/                    # TypeScript definitions
├── src/components/demo/          # Live examples
├── docs/                         # Documentation (you are here!)
└── test/                         # Test suites
```

## Coming Soon: Official Release

### Installation (v1.0)

When Form Engine v1.0 is released, installation will be straightforward:

```bash
# npm
npm install @andeeplus/form-engine

# yarn
yarn add @andeeplus/form-engine

# pnpm
pnpm add @andeeplus/form-engine

# bun
bun add @andeeplus/form-engine
```

### Peer Dependencies

Form Engine is built on top of solid foundations:

```json
{
	"peerDependencies": {
		"react": "^18.0.0",
		"react-hook-form": "^7.45.0",
		"zod": "^3.22.0"
	}
}
```

These libraries handle the core form logic (React Hook Form) and validation (Zod), while Form Engine adds the declarative layer and advanced features on top.

### Basic Setup (v1.0)

```typescript
// app.tsx
import { FormEngineProvider } from "@andeeplus/form-engine";
import { FormRenderer } from "@andeeplus/form-engine";

// Import the field types you need
import "@andeeplus/form-engine/fields/input";
import "@andeeplus/form-engine/fields/select";
import "@andeeplus/form-engine/fields/textarea";

function App() {
	return (
		<FormEngineProvider>
			<FormRenderer config={formConfig} />
		</FormEngineProvider>
	);
}
```

### Tree-Shaking Support

Form Engine is designed with tree-shaking in mind. Only import the field types and actions you actually use:

```typescript
// Only these components will be included in your bundle
import "@andeeplus/form-engine/fields/input";
import "@andeeplus/form-engine/fields/select";
import "@andeeplus/form-engine/actions/submit";
import "@andeeplus/form-engine/actions/auto-save";
```

## Development Environment Setup

### IDE Support

Form Engine is built with TypeScript and provides excellent IDE support:

- **VS Code**: Install the TypeScript and React extensions for the best experience
- **IntelliSense**: Full autocomplete for form configurations
- **Type Checking**: Catch configuration errors at compile time
- **Refactoring**: Safe renaming and restructuring

### Recommended Extensions

For VS Code users, these extensions enhance the development experience:

```json
{
	"recommendations": [
		"bradlc.vscode-tailwindcss",
		"ms-vscode.vscode-typescript-next",
		"esbenp.prettier-vscode",
		"ms-vscode.vscode-json"
	]
}
```

### Development Scripts

When working with the Form Engine repository:

```bash
# Development server (file watching)
bun dev

# Development server (hot module replacement)
bun hot

# Build for production
bun build

# Run production server
bun start

# Run tests
bun test

# Type checking
bun run tsc --noEmit
```

## Next Steps

### Quick Start

Once you have Form Engine running, check out the [Quick Start Guide](./quick-start.md) to build your first form in 5 minutes.

### Component Integration

Learn how to integrate your existing component library with [Components → Registration](./components/registration.md).

### Live Examples

Explore the comprehensive examples at `http://localhost:3000/demo` to see Form Engine's capabilities in action.

### Stay Updated

- ⭐ **Star the repository** on GitHub to follow development
- 📧 **Watch releases** to be notified when v1.0 is available
- 💬 **Join discussions** to share feedback and requests
- 🐛 **Report issues** to help improve the library

---

_Form Engine is being built with care and attention to developer experience. We can't wait to share the stable release with you!_
