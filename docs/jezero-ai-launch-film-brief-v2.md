# Jezero AI launch film: brief for Claude Code (version 2)

This file is the complete brief. It holds the story, the facts you may use, the design system, the visual direction and the build requirements. A first version of this film has already been built; this brief keeps what worked in it and fixes what didn't.

## Before you start

- Use Opus 5.5 with effort set to high or xhigh.
- Read this whole file before doing anything.
- Read `reference/v1.html` as described in "What to keep from version 1". It is a reference only. Do not copy it wholesale.
- Your first deliverable is a storyboard with a layout for every shot, not code. See "Process" at the end.

## What we're making

A looping, silent, 60-second launch film for Jezero AI, played on screens at industry events and on exhibition stands. It should feel like a premium product launch film (think Apple or Stripe): crisp, calm, precise and expensive-looking. Not a presentation, not a template, and not a tech demo.

You are the motion designer. The story, facts and design system below are fixed. How you visualise each moment is your call, within this direction.

## Lessons from version 1

Version 1 was reviewed on screen. This is the feedback, and it drives everything in this brief.

**Keep:**
1. The planet visuals.
2. The isometric scenes, especially the grid of walled tiles where a band of tiles lights up.
3. The transitions: one continuous camera that hands off from shot to shot, and the smooth dolly-zoom between the wide cinematic view and the isometric view.

**Fix:**
1. **The 3D didn't look high quality enough.** The AI gateway scene was the worst example: a glowing ring, floating particles, toy-like blocks and mixed styles. The padlocks also looked like toys. Every 3D object must now come from one consistent, precise isometric kit (see "World design").
2. **Coloured blurs.** Remove all bloom, glows, coloured background gradients and halos. The film must feel premium and crisp.
3. **Text was placed anywhere.** Headlines and labels overlapped each other and the visuals, were cut off at the edge of the screen, and were sometimes unreadable. Every shot now uses a fixed layout from one design system (see "Layout system"), and the build is checked automatically for overlaps.
4. **The font.** Instrument Sans is replaced with something more modern (see "Typography").

## What to keep from version 1

`reference/v1.html` is a single file built from named modules. Reuse these ideas and code, adapted to this brief:

| Keep | Where in v1 | How to adapt it |
|---|---|---|
| Camera system and transitions | `orbitShot`, `toOrbit`, `isoOrbit`, `mixOrbit`, and the scene list in `90-timeline.js` where each scene starts from the previous scene's final orbit | Keep the approach exactly: one continuous camera, every shot starting where the last one ended, with the log-eased field-of-view dolly between cinematic and isometric views. |
| Planet | `makePlanet` in `15-brand.js` | Keep the rendering approach (the lighting, terminator and limb quality), but change the surface from a banded gas giant to Mars (see "The planet"). Remove the wide outer glow. |
| Walled tiles | `trayGeometry` and the tile grid in `30-accounts.js` | This is the building block of the new isometric kit. |
| Lighting for blocks | the ambient light plus key and fill directional lights in `05-world.js` | Keep as a starting point. |
| Determinism | `rng`, `renderFrame`, the record mode | Keep: every frame is a pure function of time. |

Remove completely:
- The bloom pass and the coloured radial background glows in the composite shader (`levels`, `downMat`, `upMat`, `uBloom`, `uC1`, `uC2`, `g1`, `g2`).
- `glowShell`, flash sprites, additive particle glows, and emissive or HDR-boosted edge lines.
- The film grain.
- Every scene from version 1 except as a source for the pieces listed above. In particular, do not reuse the gateway, dashboard, knowledge or compliance scenes.

## The audience and how they'll watch

- Senior people in regulated organisations (government, defence, financial services, healthcare): CTOs, heads of AI, CISOs, platform and security leads.
- They have never heard of Jezero AI.
- They are walking past a stand. They will glance at the screen for 3 to 8 seconds, with no sound, and join the loop at a random point.
- So every few seconds must make sense on its own, text must be readable from 3 metres away, and the brand must be visible at all times.

The film's job is not to explain everything. It is to make the right person recognise their problem, believe Jezero AI solves it, and walk over to the stand.

## Messaging principles

- Lead with what changes for the viewer, not with how clever the product is.
- Make an impact in the first seconds.
- End with what to do next and when (talk to us now).
- Plain English. No jargon a non-technical executive wouldn't use.

## Background: what Jezero AI is

You need this context to make good creative decisions. Not all of it goes on screen.

- Jezero AI is a secure, modular AWS platform that lets organisations build and run AI, including AI agents, safely. It handles the hard parts (security, governance, compliance, visibility and cost control) so teams can focus on building.
- It is built on AWS's own Landing Zone Accelerator toolkit, extended and hardened by IdentityE2E.
- It gives organisations a secure AWS foundation in about a day, instead of the months it usually takes to build one by hand. Each team gets its own walled-off space inside it.
- All AI requests (from teams, apps and agents) go through one gateway: every request is authenticated, only approved models can be used, every prompt and response is logged, and cost is tracked per team with budgets.
- Live dashboards show AI usage, speed, errors and cost.
- Automated compliance testing turns control sets into tests that run on every change, so compliance is proven continuously rather than written in documents.
- There is no software licence. Clients pay for the work to build, run and support it, plus their own AWS usage.
- There are four ways to work with us: Accelerate, Build and Own, Managed Service, and Migrate and Transform.
- Jezero AI is made by IdentityE2E, a CACI business, which is an AWS Premier Tier Partner.
- The name comes from Jezero crater on Mars. This inspires the visual theme.

## Approved claims

Only these claims may appear on screen. If a shot needs a fact that isn't here, leave it out.

- Everyone is experimenting with AI, but few make it to production. (Framing, not a statistic. Never attach a number to it.)
- The five things that hold AI back: infrastructure, governance, compliance, visibility and cost.
- Jezero AI lets you say yes to AI, safely.
- A secure AWS foundation in about a day. (Never "fully live in a day".)
- Every AI request checked, approved and logged.
- Compliance proven by tests, with evidence on demand.
- See what your AI is doing, as it happens.
- Cost tracked per team, with budgets.
- Get your AI agents and workloads into production, fast and securely.
- No software licence.
- Four ways in: Accelerate, Build and Own, Managed Service, Migrate and Transform.
- IdentityE2E, a CACI business. AWS Premier Tier Partner.
- The five answer sections, each a headline with one supporting line (approved wording, added 2026-10-08):
  - Infrastructure: "Days, not months." / "A secure AWS foundation in about a day, built to scale with every new team."
  - Governance: "Every AI request checked." / "One gateway for every team, app and agent. Approved models only, every prompt logged."
  - Compliance: "Proven, not promised." / "Real-time compliance, tested against live infrastructure on every change, not slow, costly manual audits."
  - Visibility: "See everything, live." / "Live dashboards for usage, speed, errors and cost across every team."
  - Cost: "No surprise bills." / "Every request costed and capped, with budgets set per team or per account."
- The production shot (approved wording, added 2026-10-08): "Your AI agents, in production." / "Fast, secure and fully governed, from day one."
- The four ways in, each with a line of detail (approved wording, added 2026-10-08):
  - 01 Accelerate: "Our proven patterns, in your AWS estate."
  - 02 Build and Own: "We build it in your accounts. You own it."
  - 03 Managed Service: "We run it for you."
  - 04 Migrate and Transform: "Move your existing platform onto Jezero."

Do not include:
- Any prices or numbers other than "about a day".
- Any controls specifically for agents, such as agent identities, autonomy levels or agent permissions. These are not live yet. Agents may be shown running on the platform and passing through the gateway, but nothing more.
- Customer names.
- Technical product names: Landing Zone Accelerator, LLM Gateway, MCP, Bedrock, OSCAL, CloudWatch and so on.

## The story

Seven sections, in this order.

1. **Current state.** Everyone's experimenting with AI, but few get anything into production.
2. **Why.** Five fears hold them back: infrastructure, governance, compliance, visibility and cost.
3. **Jezero AI answers them one by one.** Each fear gets its own beat and is resolved.
4. **The finished story.** With Jezero AI, your AI agents and workloads get into production, fast and securely.
5. **Ways in.** No software licence, and four ways to start.
6. **Who we are.** Not a separate scene: one quiet line on the end card.
7. **Call to action.** Talk to us, with a QR code.

### The central device: the five-word tracker

When the five fears appear in section 2, they settle into a tracker row along the bottom of the screen that stays visible through section 3:

Infrastructure  Governance  Compliance  Visibility  Cost

Each word starts in the problem state. As Jezero AI answers each one, that word switches to the resolved state. When all five have switched, the payoff in section 4 lands. Anyone joining the loop midway can see instantly where they are. Its exact design is in "Layout system".

## Layout system

This is the most important change from version 1. Every shot uses exactly one of the layouts below. Text is never placed freely.

### Stage and grid

- Stage: 1920 x 1080, scaled to fit any screen with letterboxing.
- Safe area: 120px from the left and right edges, 96px from the top and bottom. Nothing except the world layer goes outside it.
- Grid: 12 columns across the safe area (1680px wide), 24px gutters, so each column is 118px wide. Column 1 starts at x = 120.
- Spacing: every distance is a multiple of 8px.

### Persistent chrome

- **Corner logo.** The Jezero AI logo, 32px tall, top left, at x = 120, y = 72. Visible throughout the film except during the logo reveal and the end card, where the large logo replaces it.
- **Five-word tracker.** Bottom of the safe area: left edge at x = 120, text baseline at y = 1000. Visible from 10 to 41 seconds.
  - Each word is set in the label style (see "Typography"), 48px apart.
  - A 12px square marker sits 12px to the left of each word. Problem state: a coral outline square, word in secondary text colour. Resolved state: a filled mint square, word in primary text colour. The switch is a 0.4 second fill, not a flash.
  - No box, background or divider around the tracker.

### Layout A: statement

For the big lines: sections 1, 2 and 4.

- Text block in columns 1 to 7, left aligned at x = 120.
- Display size, up to 2 lines.
- Vertically, the block sits slightly above centre: the top of the first line at about y = 380 for a 2-line block, adjusted so the block's optical centre is at about y = 500.
- The world is framed so its main subject sits in columns 7 to 12 or fills the whole frame as a quiet background. Nothing busy sits behind the text.

### Layout B: explain

For the five answer shots in section 3 and the ways-in shot.

- **Text column:** columns 1 to 5 (x = 120 to 806).
  - Headline at the top of the column: the top of its first line at y = 216, headline size, up to 3 lines.
  - Supporting line 32px below the headline, supporting size, up to 2 lines.
  - Any figure or list sits 48px below that.
- **Visual zone:** columns 6 to 12 (x = 830 to 1800, y = 96 to 920). The camera frames the world so the subject of the shot sits inside this zone. The text column stays clear of any busy world content.
- **Diagram labels** appear only inside the visual zone (see "Labels").

### Layout C: hero

For the logo reveal.

- Logo lockup centred horizontally, its centre at y = 400.
- Supporting line centred, 40px below the lockup.
- The world subject sits in the lower half of the frame.

### Layout D: end card

- Columns 1 to 8: the closing line at display size, the call to action at supporting size 40px below it, and the company line at label size, bottom-aligned with the QR code.
- Columns 10 to 12: the QR code, 264px square, white on the background with a quiet zone, its bottom edge at y = 920.
- The large Jezero AI logo above the closing line, 64px tall, and the CACI logo beside the company line.

### Labels

Diagram labels name things in the world. They caused most of the overlap problems in version 1, so the rules are strict.

- At most 3 labels on screen at once.
- Label style only, sentence case, 4 words or fewer.
- Each label has a fixed slot in the visual zone, chosen in the storyboard, not a position that floats with the 3D object. A 1px leader line in the secondary text colour runs from the label to its object, ending in a 6px dot on the object.
- Labels keep at least 24px clear of each other, of every other piece of text, and of the silhouette of every object in the world, including the object they point to.
- Labels enter and leave with their object.

### Contrast

- Text sits on clear background, never on top of busy world content. Achieve this through framing first.
- If the world must pass behind text, a neutral black gradient scrim is allowed. Never a coloured one.
- Every piece of text must reach a contrast ratio of at least 4.5:1 against what is behind it, at every frame. The layout check enforces this.

## Typography

- **Geist** for all headlines and supporting text, and **Geist Mono** for labels, the tracker, figures and the four ways in list. Both are free under the SIL Open Font License. Take the woff2 files from the `geist` npm package and embed them as base64 so the film works offline.
- Type scale (the only sizes allowed):

| Style | Font | Size and line height | Weight | Tracking |
|---|---|---|---|---|
| Display | Geist | 120px / 120px | 600 | -3% |
| Headline | Geist | 80px / 88px | 600 | -2.5% |
| Supporting | Geist | 40px / 52px | 400 | -0.5% |
| Label | Geist Mono | 26px / 32px | 500 | 0 |

- All text is left aligned to the grid, except in layout C.
- Break lines by hand at natural phrase points. No single word on a line on its own.
- No more than about 8 words in any headline. Each line holds for at least 2 seconds.
- Sentence case everywhere: capitalise only the first word and proper nouns. No all-caps, including labels.
- British English spelling.

### Text motion

Text motion is consistent across the whole film:

- **Enter:** a mask reveal, each line rising 24px into place over 0.6 seconds with an exponential ease-out, lines staggered by 0.1 seconds.
- **Exit:** fade out while rising 8px over 0.3 seconds.
- **Hand-over:** outgoing text finishes leaving before incoming text starts entering in the same place. Two text blocks never share a layout slot at the same moment.
- At most one scale slam in the whole film, on "Why?".
- Text always comes to rest flat, horizontal and fully inside the safe area.

## World design

### The rule: one world, one kit

Everything in 3D comes from a small, consistent kit and follows one set of rendering rules. Quality comes from restraint and consistency, not from adding effects.

### The planet

- Mars, seen from orbit: rust and ochre terrain with darker basalt plains, a small pale polar cap and a few large crater rims. Jezero crater is a clearly visible small crater that the camera can descend into.
- Use v1's `makePlanet` lighting approach: soft terminator, darker night side, the gentle surface detail moving slowly.
- The atmosphere is a thin, crisp rim of a few pixels on the lit limb only. No outer glow or halo.
- Background is flat near-black space with fine, sharp stars. No coloured gradients or glows anywhere.

### The isometric kit

Used for every shot inside the crater. It grows out of v1's walled tile grid, which was the best-looking thing in version 1.

- **Primitives only:** walled trays (from `trayGeometry`), flat plates, slabs, square columns, floor tracks (thin inset grooves) and small cubes. No other shapes. No icons, padlocks, people, rings, spheres or hexagons in 3D.
- **One grid unit.** Every object's footprint and height is a multiple of the same unit, and every object sits on the grid.
- **Three-tone faces.** Each object shows a clear lightest top face, a mid left face and a dark right face, from one consistent key light. Matte materials, no metalness, no emissive light.
- **Opaque.** No transparent or glass objects, no stacked see-through layers. Things fade in and out by scaling or sliding into place, or by a quick fade of a whole object at most.
- **Grounding.** Soft but tight contact shadows under every object from one shadow-casting light, so nothing floats.
- **Edges.** A thin edge line on every object, one tone lighter than its top face, with the same line weight across the whole film. Use screen-space thick lines if 1px lines shimmer.
- **Movement means meaning.** Requests and data are small cubes moving along floor tracks in orderly lanes, at constant spacing. Never free-floating particles or clouds of dots.
- **Floor.** The crater floor is the darkest step of the Mars range, with faint, fine contour lines or a faint survey grid one step lighter. No glow.

### Colour

Each colour has one job. Use the ramps as given and do not introduce other colours.

| Role | Colours |
|---|---|
| Space | `#05070d`, flat |
| Primary text | `#f3f6fc` |
| Secondary text, leader lines | `#9aa6bf` |
| Mars ramp, dark to light | `#140a0c`, `#3a1814`, `#7a3322`, `#b85a38`, `#e2a27a` |
| Platform ramp (isometric kit), dark to light | `#0f2a2c`, `#1b4547`, `#2c6464`, `#3f8582`, `#5ea9a2` |
| Lit or resolved platform state | `#9fe3d6` |
| Problem state | coral `#f97362` |
| Resolved state (tracker, live agents) | mint `#7ef0c0` |
| Brand accent | violet `#8b5cf6`, only for the Jezero logo and brand moments |
| AI agents and workloads | crisp white `#f3f6fc` points, mint once live |

Within any isometric shot, the kit is a single tonal ramp (the platform teal) plus at most one accent colour for the thing that matters in that shot. That restraint is what made the v1 tile grid look good.

### Rendering quality

- 4x multisample anti-aliasing, and the world rendered at 2x for the MP4 export.
- Correct colour management end to end, so tones don't go muddy.
- No post effects except a very gentle vignette. No bloom, glow, grain, chromatic aberration or depth-of-field blur.
- Stars and agent lights are sharp points with no halos.

### Mars theme: clean and futuristic, never tacky

The film is set on and above Mars, and the platform is built in Jezero crater, which makes it literally a landing zone. This is never stated in the text; it is the world the story happens in.

Banned: rockets, astronauts, rovers, spacecraft, mission control screens, NASA imagery or logos, flags, aliens, sci-fi interfaces, space puns, and anything that would look at home on a sci-fi film poster.

### Brand presence

- The corner logo throughout (see "Persistent chrome").
- The full logo at the reveal and on the end card.
- Logo files load from `assets/jezero-ai-logo.svg` and `assets/caci-logo.svg` if they exist. If they don't, show a plain "Jezero AI" wordmark in Geist 600 and leave a clearly marked space for the CACI logo. Never draw your own version of either logo.

### Motion

- Calm, confident and precise. Long ease-outs and critically damped springs. No overshoot, bounce or elastic easing.
- Camera moves are slow and continuous, using v1's hand-off system. No cuts between unrelated places.
- Every frame has something meaningful happening, but never more than one main thing at a time.

### Banned everywhere

- Bloom, glows, halos, coloured background gradients, lens flares, light leaks
- Particle bursts, free-floating particle clouds, explosions, shockwave rings
- Transparent or glass objects, 3D icons, toy-like shapes
- Glowing grid floors
- RGB split, glitch effects, camera shake, flashing backgrounds, grain
- Bouncy or elastic easing, typewriter text
- Boxes or cards behind text, outlined rounded boxes, cards with a coloured accent bar down one edge
- All-caps labels with wide letter spacing, pill-shaped tags
- Em dashes in any text
- Title case headings
- American spelling
- Anything that looks like a template or a slide

## Storyboard

Timings sit on a 120 BPM grid: one beat is 0.5 seconds, one bar is 2 seconds. Every cut and every text entrance lands on a beat, even though the film is silent. The on-screen text is final. You may split a line across beats, but don't change the words without asking.

| Time | Layout | On screen (exact text) | World |
|---|---|---|---|
| 0 to 4s | A | "Everyone's experimenting with AI." | Mars from orbit, night side turning towards the terminator, framed right. Dozens of small white points of light appear across the surface: AI agents and pilots. |
| 4 to 8s | A | "Few make it to production." | Most of the points dim to coral and go out. A few remain, scattered and unconnected. |
| 8 to 10s | A | "Why?" | The planet holds still. The single scale slam of the film. |
| 10 to 14s | A, then tracker | Infrastructure. Governance. Compliance. Visibility. Cost. | The five words land one per beat in a stacked column at headline size, then shrink and slide down into the tracker row, which stays. |
| 14 to 18s | C | Jezero AI logo, then "Say yes to AI. Safely." | The camera descends towards Jezero crater in a continuous move, dolly-zooming from the cinematic view to the isometric view as it arrives above the crater floor. |
| 18 to 23s | B | "A secure AWS foundation." then supporting line "In about a day." Figure below, in label style: "months" struck through, then "about a day". | On the crater floor, a grid of walled trays assembles row by row, each locking into place. A diagonal band of trays lights to the lit state as the foundation completes. Tracker: Infrastructure resolves. |
| 23 to 28s | B | "Every AI request checked, approved and logged." | The camera slides along the grid to one edge, where a single gate slab spans three floor tracks. Small cubes travel along the tracks in lanes, pass through the gate and come out mint. One coral cube stops at the gate and is moved aside onto a short side track. Labels (max 3): "Agents", "Apps", "Teams" on the lanes. Tracker: Governance resolves. |
| 28 to 33s | B | "Compliance proven by tests." then supporting line "Evidence on demand." | A thin plate of light sweeps across the tray grid like a scanner. Each tray's floor switches to the lit state as the plate passes. At the grid edge, a neat stack of thin plates grows one at a time: the evidence. Label: "Evidence". Tracker: Compliance resolves. |
| 33 to 37s | B | "See what your AI is doing, as it happens." | Small cubes move steadily along tracks between the trays. Beside the grid, a flat panel in the same isometric projection draws three crisp line charts as single strokes, updating as the cubes move. No fills. Tracker: Visibility resolves. |
| 37 to 41s | B | "Cost tracked per team, with budgets." | Square columns rise from three groups of trays, one per team, and stop exactly at a thin outlined budget plane. One column approaches the plane and holds just below it. Label: "Budget". Tracker: Cost resolves. |
| 41 to 47s | A | "Your AI agents, in production." then "Fast. And secure." | The tracker fades out. The camera rises from the crater back to orbit in one continuous move. The points of light from the opening return across the surface, now mint, linked to the crater by fine, crisp arcs. |
| 47 to 53s | B | "No software licence." then "Four ways in." then the list, in label style: "01 Accelerate", "02 Build and Own", "03 Managed Service", "04 Migrate and Transform". | Four fine trajectories arc in towards Jezero crater, one per beat, each appearing as its list line enters. |
| 53 to 60s | D | "Say yes to AI. Safely." then CTA_TEXT with the QR code, and "IdentityE2E, a CACI business. AWS Premier Tier Partner." | Mars in calm half-light, framed right, end card held for at least 4 seconds. The camera then drifts round to the night side, flowing straight back into the opening shot. |

## Build requirements

- **One self-contained offline HTML file** at a fixed 1920 x 1080 stage. No network requests at runtime; inline every library, font and script. Event venues often have no Wi-Fi.
- **Deterministic time.** Every frame is a pure function of time, exposed as `window.seek(t)` and `window.DURATION`. No CSS transitions, no timers, no `Date.now()` or `performance.now()` driving animation, no `Math.random()` without a fixed seed. For live playback, a `requestAnimationFrame` loop simply calls `seek(t)`.
- **Layout as data.** Define the grid, the layouts, the type scale and every label slot as constants in one place, and place all text through them. No hand-tuned pixel positions inside scenes.
- **Seamless loop.** The last frame flows into the first with no visible jump, including camera position and motion.
- **Review controls,** shown only with `?debug` in the URL: a scrub bar, current time and section name, play and pause on space, arrow keys to jump between sections, `?t=` to start at a given second, an fps readout, and a `?grid` option that overlays the 12-column grid and safe area.
- **MP4 export.** A `render.mjs` script using Playwright that captures 3 subframes per output frame and blends them with ffmpeg `tmix` for real motion blur, producing `jezero-ai-launch-film.mp4` at 1920 x 1080, 60fps, H.264, yuv420p, high quality. Many venue screens only play MP4 from a USB stick. If ffmpeg isn't installed, say so and give the install command.
- **Performance.** Steady 60fps for live playback on a mid-range laptop. Pre-build geometry; don't allocate per frame.
- **Configurable call to action.** Put the CTA line and the QR code URL in two constants at the top of the file (`CTA_TEXT` and `CTA_URL`). Generate the QR code as inline SVG from `CTA_URL`. Use the placeholders "Talk to us today" and `https://example.com` until they're confirmed.

### Automated layout check

Write `check-layout.mjs` (Playwright) and run it before every review stop. It seeks through the whole film every 0.1 seconds and fails with a list of timestamps if:

- any two text elements overlap, or sit closer than 24px;
- any text element goes outside the safe area;
- any label overlaps the projected screen bounds of any world object, or has more than 3 labels on screen;
- any text block falls below 4.5:1 contrast against the rendered world behind it, sampled from the canvas;
- two text blocks occupy the same layout slot at the same moment.

It also saves `review/contact-sheet.png`: one frame per second of the film in a grid, with the time under each, so the whole film can be reviewed at a glance.

## Process

1. **Storyboard first.** Turn the storyboard into a shot-by-shot plan: for each shot, the exact timing on the beat grid, the layout used, the exact position of each text block and label slot, the camera position and move, the world content, and how it hands over to the next shot. Include a short note on how you'll build the isometric kit and the Mars planet. Show me this and wait for approval before writing code.
2. **Build the foundation first:** the design system constants, fonts, layouts, text motion, persistent chrome, the camera system from v1, the Mars planet, the isometric kit and the layout check. Then build sections 1 and 2. Stop for review with the contact sheet.
3. **Build the rest** section by section, stopping for review after section 3 and again after the end card.
4. **Self-review before every stop.** Run the layout check until it passes. Look at the contact sheet and at least 20 full-size frames, and fix anything cluttered, low quality, off the grid, off the beat or empty. Check every line of on-screen text against the approved claims, for em dashes, for sentence case and for British spelling.
5. **Final export** once everything is approved.

## Open items (use placeholders until confirmed)

- The call to action wording and QR code destination.
- The Jezero AI and CACI logo files.
- Which event the film is first used at, which may change the emphasis slightly.
