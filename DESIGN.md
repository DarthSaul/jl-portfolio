---
version: 2
name: joan-lebow-editorial
description: The "Homepage" mockup Joan approved (2026-11, source in ../Homepage-html/Main.dc.html) — an editorial, newspaper-like page. A large tight serif wordmark with an italic byline, ink hairline rules under every band, small tracked sans labels, warm off-white paper and one red accent for the things you can act on. Replaced a Wired-derived spec.

colors:
  ink: "#161616"        # text, the wordmark, every rule, the dark button
  ink-soft: "#4A4741"   # summaries under a headline
  muted: "#55524C"      # the byline, the footer
  subtle: "#6B6760"     # captions, placeholder labels
  hairline: "#161616"   # rules are ink, 1px
  accent: "#B3261E"     # link hover, the active menu underline, writing eyebrows, READ MORE
  canvas: "#FAFAF7"     # the paper
  canvas-soft: "#E7E2D8"
  placeholder: "#DDD7CC"
  placeholder-alt: "#D2CBBE"

typography:
  wordmark:      { fontFamily: Newsreader, fontSize: "clamp(48px, 7vw, 96px)", fontWeight: 600, lineHeight: 0.95, letterSpacing: -0.03em }
  tagline:       { fontFamily: Newsreader, fontStyle: italic, fontSize: 20px, fontWeight: 400 }
  nav:           { fontFamily: Inter, fontSize: 15px, fontWeight: 500 }
  display-lg:    { fontFamily: Newsreader, fontSize: 44px, fontWeight: 600, lineHeight: 1, letterSpacing: -0.02em }   # band heading
  display-md:    { fontFamily: Newsreader, fontSize: 32px, fontWeight: 600, letterSpacing: -0.01em }                   # Instagram handle
  display-sm:    { fontFamily: Newsreader, fontSize: 28px, fontWeight: 600, lineHeight: 1.15 }                         # card headline
  byline:        { fontFamily: Inter, fontSize: 12px, fontWeight: 600, letterSpacing: 0.12em }                        # eyebrow, uppercased at the call site
  body-md:       { fontFamily: Inter, fontSize: 15px, fontWeight: 400, lineHeight: 1.5 }
  body-sm-strong:{ fontFamily: Inter, fontSize: 14px, fontWeight: 600 }                                               # "Read more →", "All copy →"
  caption:       { fontFamily: Inter, fontSize: 13px, fontWeight: 400 }

layout:
  container: 1320px, 32px side padding
  section-gap: 96px between bands on the front page
  rule: 1px solid ink — under the masthead, under each band heading, over the footer

rounded:
  none: 0px      # everything
  full: 9999px   # only the header's social icon links and the "Follow on Instagram" pill
---

# Joan Lebow — design

`web/src/app/globals.css` is the implementation and the only place tokens are decided; this file
is the spec it follows. The spec is swappable, the layout is not: a new spec re-skins tokens and
`type-*` call sites and does not reopen the two rules in CLAUDE.md.

## Character

A printed page, not an app. Her name is the largest thing on every page, in a tight serif, with
her byline in italics beneath it. Bands are separated by space and a single ink rule, never by
fills, cards or shadows. Labels are small, uppercase and tracked in Inter; headlines and reading
text are Newsreader. One colour — a deep red — marks what you can act on: a hovered link, the
current menu item, the source/date line over a piece of writing.

## Faces

- **Newsreader** (variable, `opsz` 6..72, 400–600 upright, 400 italic) — the wordmark, headlines,
  the byline, long-form body. The optical-size axis gives the 96px wordmark its display cut and
  body text its text cut from one file.
- **Inter** (400–700) — nav, metadata, captions, buttons.

## Masthead

Not sticky. Wordmark over byline on the left (6px apart); the menu and three social icons on the
right, bottom-aligned with the byline; 36px above, 22px below, then the rule. The active menu item
has a 2px accent underline. Below `md` the menu and icons fold into a full-screen drawer.

## Front page, top to bottom

1. **Hero** — her choice in the Studio: the square photo grid, or the carousel (one large picture
   at a time, shown whole inside a 20:9 frame — never cropped — a 700ms crossfade every four seconds, optional thin numbered markers beneath
   whose active bar fills with the accent).
2. **Featured writing** — band heading with "All copy →" on the right over a rule; three cards,
   each cover, eyebrow (source · date, accent), headline, summary, "Read more →".
3. **Instagram** — glyph and handle with a black "Follow on Instagram" pill on the right over a
   rule; six square tiles (three on a phone), 6px apart.

## Footer

A rule, then the lowercase copyright on the left and Instagram / Substack / Email as text links on
the right, 14px, muted.

## Don'ts

- No shadows, no fills behind bands, no rounded corners beyond the two `full` exceptions.
- No second accent colour. Reach for ink first.
- No `text-transform` inside a type token — uppercase is a class where the design asks for it.
