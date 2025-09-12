# Form Engine

> **A JSON-driven, highly customizable React form library that adapts to your needs, not the other way around.**

## Why Form Engine?

After years of wrestling with form libraries, building custom solutions, and hitting the same walls over and over again, I realized something: **forms shouldn't be this hard**. Every project had different requirements, different designs, different validation needs, and different actions to perform. Yet, most form libraries force you into their way of thinking.

Form Engine was born from frustration and refined through real-world use. It's not just another form library—it's a **JSON-driven UI system** that lets you create complex, interactive forms using simple schemas while maintaining complete control over your components and logic.

## What Makes It Different?

**Complete Customization**: Bring your existing component library. Wrap it with our tools, and it instantly adapts to form schemas while getting all the React Hook Form goodness.

**JSON-Driven**: Define complex forms with simple JSON schemas. No more writing repetitive JSX for similar forms.

**Registrable Everything**: Not just components—actions, validations, layouts. Build your own plugins and solutions that fit your exact needs.

**Zod Integration**: Type-safe validation that just works. Define your schema once, get validation everywhere.

**Action System**: Perform complex operations at any point in your form lifecycle. Auto-save, analytics tracking, multi-step navigation—all through a pluggable action system.

## Repository Structure

This repository contains both the **library source code** and a **comprehensive documentation site**:

```
├── src/lib/form-engine/     # Core library code
├── src/pages/_docs/         # Legacy documentation (being restructured)
├── src/components/demo/     # Live examples and demos
├── docs/                    # New documentation structure
└── test/                    # Test suites
```

## Development

This project uses [Bun](https://bun.com) as the JavaScript runtime.

### Getting Started

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun dev

# Build for production
bun build

# Start production server
bun start
```

### Available Scripts

- `bun dev` - Development server with file watching
- `bun hot` - Development server with hot module replacement
- `bun build` - Build the project for production
- `bun start` - Start production server
- `bun preview` - Preview production build

## Documentation

The documentation is being restructured to better reflect the vision and capabilities of Form Engine.

- **Live Examples**: Visit the development server to see interactive demos
- **API Reference**: Comprehensive API documentation in `/docs`
- **Migration Guide**: Coming soon for existing users

## Status

**Work In Progress** - Form Engine is currently in active development. The core API is stabilizing, but breaking changes may still occur before the first stable release.

## Contributing

This is a passion project born from real-world needs. Contributions, feedback, and ideas are welcome! See the documentation for contribution guidelines.

---

_Built with ❤️ by developers who believe forms should be powerful, not painful._
