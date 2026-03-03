---
description: Compare design mockups against implementation to detect UI mismatches (colors, layout, typography)
---

# Design Review Command

Compare a design mockup image against its implementation code to detect visual mismatches in colors, layout, typography, spacing, and component structure.

See `skills/design-review/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:design-review [design mockup path] [implementation path]
```

## Examples

```
/team-shinchan:design-review "./mockup.png" "./src/components/Login.tsx"
/team-shinchan:design-review "./designs/homepage.png" "./src/pages/Home/"
/team-shinchan:design-review "./figma-export.png"
```
