# Claude Instructions — weekly-tasks-app

## Mobile-First Development

All new features and UI changes must be implemented mobile-first:
- Default styles target mobile (< 768px)
- Desktop enhancements added via `@media (min-width: 768px)`
- Breakpoint value lives in `app/lib/breakpoints.ts` (`BREAKPOINT_DESKTOP = 768`)
- CSS modules reference it as a comment: `/* breakpoint: BREAKPOINT_DESKTOP (app/lib/breakpoints.ts) */`
- Touch interactions: never rely solely on hover to reveal controls — use `@media (hover: none)` to ensure visibility on touch devices
