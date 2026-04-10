---
description: Compare design (Figma URL or mockup image) against implementation to detect UI mismatches (colors, layout, typography)
---

# Design Review Command

Compare a design source against its implementation code to detect visual mismatches in colors, layout, typography, spacing, and component structure. Supports **Figma URLs** (via Figma MCP API for exact values) and **image files** (visual analysis).

See `skills/design-review/SKILL.md` for full documentation.

## Usage

```
/team-shinchan:design-review [design source] [implementation path]
```

## Examples

```
/team-shinchan:design-review "https://www.figma.com/design/abc123/MyApp?node-id=1-234" "./src/components/Login.tsx"
/team-shinchan:design-review "./mockup.png" "./src/components/Login.tsx"
/team-shinchan:design-review "./designs/homepage.png" "./src/pages/Home/"
/team-shinchan:design-review "https://www.figma.com/design/abc123/MyApp"
```
