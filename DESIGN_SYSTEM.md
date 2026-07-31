# Risk Intelligence Circuit Design System

Risk Intelligence Circuit is Dave Bryson's original visual system for presenting work at the intersection of payments, fraud, AML/CFT, merchant risk, analytics, and operational decision-making. It translates transaction routes, detection layers, risk signals, and investigative structure into an editorial portfolio language.

It is not a dashboard skin, cybersecurity template, cryptocurrency interface, terminal simulation, or motorsport adaptation. Human credibility and legible professional evidence take priority over spectacle.

## Brand principles

1. **Signal before decoration.** Lines, nodes, labels, and state colours must clarify hierarchy, route attention, or communicate status.
2. **Editorial before card grid.** Use open compositions, rules, indexed rows, and reading columns before introducing a contained surface.
3. **Human before system.** Portraiture, direct language, and readable prose balance technical labels and structured metadata.
4. **Evidence before theatre.** Do not invent metrics, employers, clients, outcomes, or operational claims.
5. **Control before glow.** Contrast, spacing, and typography create emphasis. Glow and blur are not default treatments.
6. **Progressive enhancement.** Navigation, content, routes, and state labels remain usable without animation or client-side rendering.

## CSS architecture

`style.css` is the stable HTML entry point and imports responsibility-based modules:

| Module | Responsibility |
| --- | --- |
| `tokens.css` | Semantic colour, typography, spacing, layout, shape, motion, and layer tokens |
| `base.css` | Document defaults, element normalization, selection, and global focus |
| `typography.css` | Editorial hierarchy, body copy, technical labels, and eyebrows |
| `utilities.css` | Skip link, screen-reader utility, reading width, and small visual utilities |
| `layout.css` | Containers, section rhythm, grids, editorial splits, reading and media primitives |
| `navigation.css` | Brand, desktop navigation, active route, and menu control styling |
| `components.css` | Buttons, signal motifs, media frames, indexed content, projects, contact, and footer |
| `motion.css` | Token-driven interactions, reveal behavior, and reduced-motion overrides |
| `responsive.css` | Breakpoint-specific composition and mobile navigation presentation |
| `home.css` | Route-specific cinematic homepage composition, Risk Intelligence Core, editorial story, evidence frames and responsive tiers |
| `portfolio.css` | Evidence-led portfolio index, status system, case-study typography, accessible diagrams and responsive case-study layouts |

Keep rules in the narrowest responsible module. Add a token instead of repeating a raw value. Raw colour values are intentionally confined to `tokens.css`.

## Colour tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `--color-background` | `#080b0d` | Primary near-black canvas |
| `--color-background-elevated` | `#0e1316` | Navigation, media frames, and contained surfaces |
| `--color-background-subtle` | `#131a1d` | Hover or section contrast |
| `--color-text-primary` | `#f3f1e9` | Warm off-white headings and primary copy |
| `--color-text-secondary` | `#c0c8c5` | Body and supporting copy |
| `--color-text-muted` | `#8d9996` | Metadata and low-emphasis labels |
| `--color-accent-primary` | `#79e3b7` | Primary action, selected signal, and key route |
| `--color-accent-secondary` | `#4fc4df` | Secondary signal, detection bracket, or node |
| `--color-positive` | `#79d6aa` | Verified positive or ready state |
| `--color-warning` | `#dfb35f` | Review, uncertainty, or elevated attention |
| `--color-critical` | `#e47b73` | Confirmed critical or blocked state |
| `--color-information` | `#70afd2` | Informational state or neutral system signal |
| `--color-focus` | `#a8ffe0` | Keyboard focus ring |

Accent colours are not used together by default. Mint establishes the primary route; cyan identifies a secondary detection layer. Amber and coral are reserved for meaningful states.

Risk meaning must never depend on colour alone. Pair state colour with readable text and at least one of: a square marker, icon, border pattern, position, or explicit status label.

## Typography

Inter remains the display and body family because it is readable across interfaces and editorial sizes, is already integrated, and uses the SIL Open Font License. JetBrains Mono remains limited to short data labels, indexes, metadata, and system states under the same licence. No new font is introduced.

| Level | Token or selector | Use |
| --- | --- | --- |
| Display | `--type-display` / `.home-page h1` | Homepage positioning statement |
| Cinematic display | `--type-home-display` / `.home-hero__title` | Phase 3 homepage statement only |
| Page title | `--type-page-title` / `h1` | Internal-page opening statement |
| Section title | `--type-section-title` / `h2` | Major narrative or capability section |
| Subheading | `--type-subheading` / `h3` | Component or subsection title |
| Large body | `--type-body-large` | Hero and page introductions |
| Body | `--type-body` | Core explanatory content |
| Supporting | `--type-supporting` | Navigation, footer, and compact copy |
| Label | `--type-label` | Eyebrows, tags, states, and indexes |
| Metadata | `--type-metadata` | Secondary technical annotation |

Display type uses tight leading and negative tracking; body copy keeps open line height and a maximum reading width. Monospace is an accent, not a page-wide voice.

## Spacing and layout

The spacing scale is based on a four-pixel minimum step:

| Token | Value |
| --- | ---: |
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-3` | 0.75rem |
| `--space-4` | 1rem |
| `--space-5` | 1.5rem |
| `--space-6` | 2rem |
| `--space-7` | 3rem |
| `--space-8` | 4.5rem |
| `--space-9` | 6.5rem |
| `--space-10` | 9rem |

Use `--section-space`, `--component-padding`, and `--grid-gap` for fluid composition. Avoid introducing one-off margins when an existing scale value expresses the relationship.

### Containers and grids

- Standard container: `76rem`
- Wide visual container: `88rem`
- Reading column: `44rem`
- Desktop gutter: `3rem`
- Tablet gutter: `2rem`
- Mobile gutter: `1rem`
- Header height: `5.25rem`, reduced to `4.875rem` at navigation collapse

Available primitives include `.container`, `.container-wide`, `.reading-column`, `.grid-two`, `.grid-three`, `.editorial-split`, `.media-full`, `.project-index`, and `.mobile-stack`.

Editorial splits use an asymmetric text/media relationship. Project indexes use horizontal rows on larger screens and a deliberate single-column sequence on mobile. Do not force unrelated sections into equal cards.

## Shape, borders, and shadows

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | 2px | Buttons, labels, images, and technical controls |
| `--radius-sm` | 5px | Media frames and navigation menu |
| `--radius-md` | 10px | Reserved for larger future surfaces |
| `--border-thin` | 1px | Editorial rules and normal boundaries |
| `--border-strong` | 2px | Selected route, state, or detection bracket |
| `--shadow-low` | restrained | Floating labels and purposeful media elevation |
| `--shadow-elevated` | restrained | Mobile menu or genuinely elevated overlay |

Prefer flat backgrounds, border changes, and partial rules. Shadows communicate elevation only. Glass blur, large radii, and glowing cyan outlines are not standard surface treatments.

## Surface types

1. **Open editorial field:** default section surface; no container border.
2. **Indexed row:** metrics and projects separated by horizontal rules.
3. **Structured panel:** service or skill content with a strong top border.
4. **Media frame:** image containment with a small radius and detection bracket.
5. **Elevated overlay:** mobile navigation or readable image annotation only.

Do not wrap content in a panel solely to fill space.

## Buttons and links

The action hierarchy is:

1. `.btn.primary` — one dominant action per decision group.
2. `.btn.secondary` — important alternative with an outlined treatment.
3. `.btn.text-action` — directional action using text and an arrow.
4. `.btn.icon-action` — social or supporting destination.

All controls provide default, hover, focus-visible, active, and disabled styling; minimum target height is 44px. Hover movement is limited to `--hover-shift` and is only applied on devices that support precise hover.

Homepage action order is selected work, contact, CV, then GitHub. Contact-page action order is email, CV, LinkedIn, then GitHub.

## Navigation

- Essential navigation remains static HTML.
- `aria-current="page"` drives the selected underline.
- Desktop navigation uses text and a restrained route rule rather than pills.
- Mobile navigation uses an opaque elevated panel, horizontal separators, and the existing focus-management behavior.
- The closed JavaScript-enhanced menu remains hidden from the focus order.
- With JavaScript disabled, the navigation remains present in document flow.

Page transitions are not part of this phase.

## Risk Intelligence motifs

Approved motifs include linear signal routes, square transaction nodes, partial detection brackets, indexed service rows, status markers, and structured technical labels. They are built with CSS and existing semantic HTML.

Motifs must be static by default, clipped to their owning component, and prevented from covering readable content. Do not introduce random particles, racing paths, fake monitoring charts, or decorative WebGL scenes.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--duration-fast` | 140ms | Colour and immediate feedback |
| `--duration-standard` | 240ms | Button, navigation, and surface response |
| `--duration-reveal` | 620ms | Existing viewport reveal |
| `--ease-standard` | controlled ease | Small interactions |
| `--ease-emphasized` | decelerating ease | Reveal entrance |
| `--hover-shift` | 2px | Maximum hover translation |

Phase 3 uses GSAP and ScrollTrigger as the single production motion system on the homepage. Timelines are route-specific, scoped with `gsap.context()` and `gsap.matchMedia()`, and reverted on teardown. ScrollTrigger activates the Risk Intelligence Core, story states and evidence-frame transitions without pinning or replacing native scroll.

No perpetual decoration, scroll pinning, scroll hijacking, custom cursor or second animation framework is part of the design system. Motion must consume the established timing principles and justify its communication purpose.

With `prefers-reduced-motion: reduce`, smooth scrolling stops, transitions collapse to effectively zero duration, animations run once, and reveal content is immediately visible without transformation.

The Phase 3 opening sequence is session-scoped, skippable, hidden by default in HTML and bypassed for reduced motion. The homepage remains fully visible when JavaScript is disabled or motion setup fails.

## Accessibility

- Primary, secondary, muted, accent, and semantic state text must maintain WCAG AA contrast on their intended dark surfaces.
- Token verification records a minimum text contrast of 6.35:1 (`--color-text-muted` on the elevated surface); primary focus contrast is 16.06:1 or higher on the same surface.
- Global `:focus-visible` uses a two-pixel high-contrast ring with four-pixel offset.
- Touch targets are at least 44px high.
- Heading order, landmarks, skip link, screen-reader utility, alt text, and static navigation are preserved.
- Buttons remain buttons and navigation destinations remain links.
- Decorative motifs use existing `aria-hidden` containers or CSS pseudo-elements.
- Status text remains visible alongside colour and marker shape.
- Content and focus must remain usable at 200% zoom and 320px viewport width without global overflow suppression.

## Responsive principles

- `> 1200px`: standard container with generous editorial gutters.
- `1024px`: navigation collapses; editorial splits become one column.
- `768px`: service, metric, skill, and project systems become single-column where necessary.
- `640px`: mobile gutters, stacked actions, natural-height heroes, and static inline technical labels.
- `390px` and `320px`: display size is constrained, labels remain at least 0.74rem, and metadata can stack.
- Large desktops retain readable line lengths rather than stretching content to the viewport.

Never fix overflow by hiding it globally. Repair the component that exceeds its container.

## Correct use

- Use one mint primary action and visually quieter alternatives.
- Use a horizontal rule and index for a collection before adding cards.
- Use a cyan bracket to identify a detection layer while mint indicates the primary route.
- Pair `Warning` text with amber, a square marker, and a stronger border.
- Keep explanatory copy in a reading column even when the surrounding visual container is wide.

## Patterns to avoid

- More than one visually dominant button in a decision group
- Pills for navigation, headings, statuses, buttons, and tags simultaneously
- Repeated transparent cards with blur and glow
- Full-page monospace or terminal language
- Generic grid backgrounds or random particles
- Colour-only risk meaning
- Arbitrary spacing, radius, colour, or duration values
- Fixed-width components that fail at 320px
- Decorative motifs over text or focus targets
- Invented metrics, outcomes, employers, or client evidence
