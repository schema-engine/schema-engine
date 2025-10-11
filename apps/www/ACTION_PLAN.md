# WWW App Update - Action Plan

## Quick Reference

This document provides a clear, actionable timeline for completing the WWW app migration to the Builder Pattern.

---

## ✅ COMPLETED

### Phase 1: Core Setup (DONE)
- [x] Updated `/apps/www/src/lib/form-engine-setup.ts` with Builder Pattern
- [x] Deleted old `/apps/www/src/lib/form-registry-setup.ts`
- [x] Built React package with TypeScript declarations
- [x] Exported all element registrations from React package

### Phase 2: Documentation (DONE)
- [x] Created `/apps/www/src/pages/docs/builder/index.mdx` (comprehensive guide)
- [x] Updated `/apps/www/src/pages/docs/quick-start.mdx`
- [x] Created `/apps/www/README.md`
- [x] Created `/apps/www/MIGRATION_TIMELINE.md`
- [x] Created `/apps/www/MIGRATION_SUMMARY.md`

### Phase 3: Examples (DONE)
- [x] Created `/apps/www/src/components/demo/builder-demo.tsx`

---

## 🚧 TODO - NEXT STEPS

### Phase 4: Update Demo Components (HIGH PRIORITY - 1 hour)

Update all demo components to use the new `formEngine` instance:

**Pattern to apply**:
```diff
- import '@/lib/form-engine-setup';
+ import { formEngine } from '@/lib/form-engine-setup';

- <FormRenderer config={config} />
+ <FormRenderer config={config} engine={formEngine} />
```

**Files to update** (13 files):

1. [ ] `/apps/www/src/components/demo/form-engine-demo.tsx`
2. [ ] `/apps/www/src/components/demo/contact-form-demo.tsx`
3. [ ] `/apps/www/src/components/demo/multi-step-demo.tsx`
4. [ ] `/apps/www/src/components/demo/validation-demo.tsx`
5. [ ] `/apps/www/src/components/demo/conditional-form-demo.tsx`
6. [ ] `/apps/www/src/components/demo/responsive-grid-demo.tsx`
7. [ ] `/apps/www/src/components/demo/actions-demo.tsx`
8. [ ] `/apps/www/src/components/demo/async-validation-demo.tsx`
9. [ ] `/apps/www/src/components/demo/constraints-demo.tsx`
10. [ ] `/apps/www/src/components/demo/field-types-demo.tsx`
11. [ ] `/apps/www/src/components/demo/simple-conditional-demo.tsx`
12. [ ] `/apps/www/src/components/demo/simple-grid-demo.tsx`
13. [ ] `/apps/www/src/components/demo/simple-input-demo.tsx`
14. [ ] `/apps/www/src/components/demo/search-form.tsx`
15. [ ] `/apps/www/src/components/contact-form-example.tsx`

**How to do it**:

For each file, run these commands:

```bash
# Edit the file to add the import and engine prop
# Example for form-engine-demo.tsx:
```

```typescript
// At the top of the file, replace:
import '@/lib/form-engine-setup';

// With:
import { formEngine } from '@/lib/form-engine-setup';

// Then find all <FormRenderer /> instances and add engine prop:
<FormRenderer config={yourConfig} engine={formEngine} />
```

### Phase 5: Testing & Validation (HIGH PRIORITY - 30 min)

After updating all demos:

1. [ ] **Type Check**
   ```bash
   cd /Users/andreazanenghi/form-engine/apps/www
   bun run typecheck
   ```

2. [ ] **Start Dev Server**
   ```bash
   bun dev
   ```

3. [ ] **Test Pages** - Visit and verify:
   - [ ] `/` (Homepage)
   - [ ] `/demo/builder-demo` (New demo)
   - [ ] `/demo/form-engine-demo`
   - [ ] `/demo/contact-form-demo`
   - [ ] `/demo/multi-step-demo`
   - [ ] `/demo/validation-demo`
   - [ ] `/docs/builder` (New docs)
   - [ ] `/docs/quick-start` (Updated docs)

4. [ ] **Check Console** - No errors in browser console

5. [ ] **Test Interactions**
   - [ ] Forms render correctly
   - [ ] Validation works
   - [ ] Form submission works
   - [ ] Multi-step navigation works

---

## 📋 STEP-BY-STEP EXECUTION

### Step 1: Update Demo Files (Manual)

For each demo file, make these two changes:

**Change 1: Import**
```diff
- import '@/lib/form-engine-setup';
+ import { formEngine } from '@/lib/form-engine-setup';
```

**Change 2: Add engine prop**
```diff
  <FormRenderer
    config={myFormConfig}
+   engine={formEngine}
    onSubmit={handleSubmit}
  />
```

### Step 2: Type Check

```bash
cd /Users/andreazanenghi/form-engine/apps/www
bun run typecheck
```

Expected output: No errors

### Step 3: Start Dev Server

```bash
bun dev
```

Expected output: Server running on `http://localhost:3000`

### Step 4: Visual Testing

Open browser and test each page:
- Forms should render
- No console errors
- Interactions should work

### Step 5: Commit Changes

```bash
git add .
git commit -m "feat(www): updated all demo components to use Builder Pattern"
```

---

## ⏱️ TIME ESTIMATE

| Phase | Task | Time |
|-------|------|------|
| ✅ Phase 1 | Core Setup | 30 min |
| ✅ Phase 2 | Documentation | 2 hours |
| ✅ Phase 3 | Examples | 30 min |
| 🚧 Phase 4 | Update Demos | **1 hour** |
| 🚧 Phase 5 | Testing | **30 min** |
| **TOTAL** | **Already Spent: 3 hours** | **Remaining: 1.5 hours** |

---

## 🎯 SUCCESS CRITERIA

- [x] Form engine uses Builder Pattern
- [ ] All demo components updated
- [ ] No TypeScript errors
- [ ] No runtime errors in console
- [ ] All forms render correctly
- [ ] Form interactions work
- [ ] Documentation is complete
- [ ] Examples are working

---

## 🔄 AUTOMATION OPTION

You can use find and replace to speed up the process:

### Find:
```typescript
import '@/lib/form-engine-setup';
```

### Replace with:
```typescript
import { formEngine } from '@/lib/form-engine-setup';
```

### Then find:
```typescript
<FormRenderer
```

### And add engine prop manually or with regex:
```typescript
<FormRenderer
  config=
  engine={formEngine}
```

---

## 📞 NEED HELP?

- **Architecture Questions**: See `/apps/www/README.md`
- **Builder Pattern**: See `/apps/www/src/pages/docs/builder/index.mdx`
- **Migration Guide**: See `/apps/www/MIGRATION_SUMMARY.md`
- **Example**: See `/apps/www/src/components/demo/builder-demo.tsx`

---

## ✨ WHAT'S NEW

The new Builder Pattern provides:

1. **Type Safety** - Full TypeScript support with autocomplete
2. **Explicit Config** - See exactly what's registered
3. **Tree-Shaking** - Only bundle what you use
4. **Flexibility** - Easy to extend with custom components
5. **Immutability** - Safe engine instance to reuse

---

## 🚀 AFTER COMPLETION

Once all steps are complete:

1. Update CHANGELOG.md
2. Tag release version
3. Announce to team
4. Create video tutorial (optional)
5. Write blog post (optional)

---

## End of Action Plan

**Current Status**: Ready to update demo components
**Next Action**: Start with Step 1 - Update demo files
**Est. Completion**: 1.5 hours
