/**
 * Minimal shadcn-style primitives for the docs site.
 *
 * Why this exists: the ported MDX files (and the live React demos) reference
 * the shadcn UI primitives from `apps/www/src/components/ui/*`. We don't want
 * to bring all 48+ shadcn files over. The shims here cover the actual surface
 * those files use: Button, Card, Badge, Tabs, Separator.
 *
 * Each shim is hand-written, Tailwind-only, no Radix, no cva. Variants and
 * sizes mirror the shadcn API where it matters.
 */
export { Button, buttonVariants } from './button';
export {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from './card';
export { Badge, badgeVariants } from './badge';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Separator } from './separator';
