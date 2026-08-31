---
name: Dunyo Hotel 1 Mini App
description: A reception key board you can reach into from inside Telegram.
colors:
  walnut-deep: "#120C09"
  walnut: "#1B120E"
  walnut-lit: "#241811"
  walnut-lip: "#3D2A1C"
  felt: "#56201A"
  brass-highlight: "#F6E9BC"
  brass: "#BE9749"
  brass-shadow: "#5C441A"
  brass-engraving: "#3A2A0C"
  card-stock: "#EDE3CE"
  card-stock-shade: "#E3D6BA"
  card-rule: "#BFAD89"
  ink: "#2A2018"
  ink-soft: "#6B5C48"
  stamp-violet: "#4A2F6B"
  alarm: "#A8321F"
  on-walnut: "#EBD9BE"
  on-walnut-soft: "#C0A177"
typography:
  display:
    fontFamily: "Archivo, 'PT Sans Narrow', sans-serif"
    fontSize: "clamp(25px, 8vw, 33px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "'PT Sans Narrow', sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.04em"
  title:
    fontFamily: "'PT Sans Narrow', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.17em"
  body:
    fontFamily: "'PT Sans', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "'PT Sans Narrow', sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.2em"
rounded:
  engraved: "3px"
  panel: "5px"
  plate: "5px 5px 9px 9px"
  drawer: "14px 14px 0 0"
  pill: "999px"
spacing:
  hairline: "4px"
  tight: "8px"
  base: "14px"
  group: "22px"
  section: "34px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.brass-engraving}"
    typography: "{typography.title}"
    rounded: "{rounded.panel}"
    height: "52px"
  button-engraved:
    backgroundColor: "{colors.walnut-lit}"
    textColor: "{colors.brass-highlight}"
    typography: "{typography.label}"
    rounded: "{rounded.engraved}"
    height: "44px"
  key-tag:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.brass-engraving}"
    typography: "{typography.display}"
    rounded: "{rounded.plate}"
    width: "68%"
  field-ruled:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "44px"
  digit-tile:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.brass-engraving}"
    typography: "{typography.display}"
    rounded: "2px"
    size: "17px"
---

# Design System: Dunyo Hotel 1 Mini App

## Overview

**Creative North Star: "The Key Board Behind Reception"**

Every room in this hotel is already a numbered physical object hanging on a wall. The system takes
that literally: the interface is a walnut board of felt-lined pigeonholes, each holding a brass key
tag on a hook, with the nightly rate engraved into the wood lip below it. Nothing here is a card
grid dressed in wood colors — the board is the navigation, the tag is the button, and the price is
carved into the furniture rather than printed on a label.

The register is warm, heavy, and unhurried: a small family hotel's reception at evening, not a
chain lobby at noon. Materials do the work that decoration usually does. Three authored raster
textures — walnut, felt and card stock — carry every ground in the system, and brass carries every
actionable thing. Because there are only three materials, an element's material tells you what it
is before you read a word of it. None of the three is a gradient impression of a material: each is
a real seamless tile, and substituting a gradient for one is how this world stops reading.

The system deliberately refuses the two defaults this category produces. It is not the
booking-aggregator look (white cards, blue accent, star ratings, carousel dots), and it is not the
boutique-hotel look (cream ground, thin serif display, full-bleed photography, acres of air). Both
were live options; both were rejected because neither says *this* hotel.

**Key Characteristics:**
- Three materials only: walnut, brass, paper — each a real authored texture, never a gradient.
- Numerals are the display voice. The largest type on the board is a room number.
- Price is furniture, not copy — engraved into the lip, visible without a tap.
- One continuous object: no route swaps, layers slide over a board that stays mounted.
- Nothing is confirmed. The language throughout is *request*, never *reservation*.

## Direction Contract

This is the brief the build was judged against. It lived as an HTML comment at the top of
`<body>` in `webapp/index.html` until it was moved here — it is internal working material and
shipped to every guest in the page source, which it should not. It is unchanged otherwise, and it
remains the thing an edit is measured against: a change that violates a line here is wrong even if
it looks better in isolation.

> **THESIS:** A hotel's rooms are already numbered objects hanging on a board behind reception;
> this surface IS that board, not a scrollable list of identical photo cards, which is what every
> booking UI ships.
>
> **OWN-WORLD:** Walnut board with recessed, felt-backed pigeonholes; aged brass key tags as the
> only bright material; engraved lettering; guest-card paper stock with a purple date stamp and a
> perforated tear-off stub. Archivo 900 numerals on brass, PT Sans / PT Sans Narrow (the CIS
> document face) on paper.
>
> **STORY:** The guest sees eight numbered keys and their nightly price with no tap, lifts one,
> reads the real photos, fills a guest card, and reads the exact message before it is sent.
> Nothing is confirmed — it is a request.
>
> **FIRST VIEWPORT:** Full-bleed board. Brass rail across the top with the hotel name and the
> UZ/RU switch. Eight pigeonholes, 2 columns x 4 rows, each holding a hanging brass tag: room
> number at 34px, price engraved on the wood lip below. Address plate engraved at the foot of the
> board — it sits just below the fold on a phone by design, so the eighth key is not crowded and
> the plate's top edge invites the scroll. Primary action is the key itself.
>
> **FORM:** Reception key board + guest card; candidate 4 of 7; seed key 34d57225.
>
> **RAISE** (from jacquard/traceability): one continuous object — board, tag, card, slip — never a
> route swap; every level stays addressable.
> **RAISE** (from multiplane): the room card slides over a board that stays visible and recedes
> behind it, rather than replacing it.
> **RAISE** (from nixie): nights and total are physical brass digit tiles that cross-fade on
> change, never silently re-rendered text.
> **RAISE** (from algorave): the tear-off stub shows the exact message the owner will receive,
> before it is sent.
>
> **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review,
> the verdict, and DESIGN.md.

## Colors

A single warm ground carrying one metal and one paper — a committed palette, not a neutral canvas
with an accent.

### Primary
- **Aged Brass** (`#BE9749`, ramped `#F6E9BC` → `#5C441A`): every actionable and every quantity.
  Key tags, the top rail, the primary button, the digit tiles, the language switch knob. If it is
  brass, it does something or it counts something.

### Secondary
- **Pigeonhole Felt** (`#56201A`): the lining behind each key, and nothing else. It exists to make
  the opening read as a cavity with something inside it. Never used for text, borders, or state.

### Tertiary
- **Stamp Violet** (`#4A2F6B`): the guest card's ink. Field labels, the drawn form icons, the
  caret, the focus underline, and the overprinted date stamp. It appears only on paper.

### Neutral
- **Deep Walnut** (`#1B120E`) and its lit and lip variants (`#241811`, `#3D2A1C`): the board, the
  sheet, the plaque, the tally panel. The default ground.
- **Card Stock** (`#EDE3CE` → `#E3D6BA`): every writing surface.
- **Lamplight** (`#EBD9BE`) and **Lamplight Soft** (`#C0A177`): body and secondary text on walnut.
- **Ink** (`#2A2018`) and **Ink Soft** (`#6B5C48`): body and secondary text on paper.
- **Alarm** (`#A8321F`): validation only.

### Named Rules
**The Three Materials Rule.** Every surface is walnut, brass, or paper. A colour that belongs to
none of them is a mistake, not a new token — including greys, which do not exist in this system.
Secondary text is tinted from its own ground (`#C0A177` on walnut, `#6B5C48` on paper), never
desaturated to grey.

**The Brass Means Action Rule.** Brass marks a thing the visitor can press or a quantity that can
change. Decorative brass dilutes the only signal the board has.

**The Theme Override Rule.** The board does not follow the Telegram client's light/dark theme; it
sets its own header and background (`setHeaderColor` / `setBackgroundColor` to `#1B120E`). A
physical object does not change colour with the surrounding chat. Telegram's other affordances —
BackButton, haptics, safe areas, closing confirmation — are honored exactly.

## Typography

**Display Font:** Archivo 900 (self-hosted, Latin subset only — it is used for digits)
**Body Font:** PT Sans 400/700 (self-hosted, Latin + Cyrillic)
**Label Font:** PT Sans Narrow 700 (self-hosted, Latin + Cyrillic)

**Character:** Archivo's engineered, near-monolinear numerals read as struck metal, which is
exactly what a room number on a key tag is. PT Sans is the typographic language of CIS official
paperwork — it was commissioned for Russian public typography — so the guest card reads as a form
the visitor has filled in before. The pairing is institutional rather than hospitable, and the
warmth comes from the materials instead.

### Hierarchy
- **Display** (Archivo 900, `clamp(25px, 8vw, 33px)`, 1.0): room numbers on key tags, the guest
  stepper value, the brass digit tiles. Digits only — the face carries no Cyrillic.
- **Headline** (PT Sans Narrow 700, 26px, uppercase, 0.04em): the room title in the sheet.
- **Title** (PT Sans Narrow 700, 18px, uppercase, 0.17em): the hotel name in the rail.
- **Body** (PT Sans 400, 15–16.5px, 1.45): addresses, notes, form input, the tear-off stub. Measure
  capped at ~34–46ch — every prose block on this surface is short by design.
- **Label** (PT Sans Narrow 700, 11–12px, uppercase, 0.17–0.24em): every field label, section
  label, engraved price, and button. Wide tracking is what makes small type read as engraving.

### Named Rules
**The Numerals Lead Rule.** On the board, the largest type in any viewport is a room number. No
heading, no price, and no call to action outranks it.

**The Engraved Label Rule.** Any label under 13px is uppercase PT Sans Narrow with ≥0.17em
tracking and a 1px shadow in the direction the light is not coming from — dark below on brass,
dark above on walnut. Small type here is always struck into a surface, never printed on one.

**The Tabular Money Rule.** Every price, date, night count, and total carries
`font-variant-numeric: tabular-nums`. Numbers in this system are compared, so their columns line
up.

## Layout

Phone-first and single-column in intent. The board is a `grid` of pigeonholes: 2 columns below
560px, 3 to 860px, 4 above, with a 12px gutter throughout — the gutter never grows, because the
board is one piece of furniture and its holes are drilled at a fixed pitch.

The board fills at least the stable viewport (`--tg-viewport-stable-height`) so it never floats on
a void; above 860px it caps at 900px and centres vertically inside Telegram Desktop's tall window.
Layers cap at 560px wide and centre there too, rather than stretching.

Spacing rhythm is 4 / 8 / 14 / 22 / 34. Page padding is 14px; a section break is 22px; a heading
always takes more space above it than below. On a 400px phone the first viewport holds the rail,
all eight keys, all seven prices, and the top edge of the address plate — the plate is meant to be
cut by the fold, because a visible edge is what asks for the scroll.

Safe areas are respected on every bottom-anchored element via `env(safe-area-inset-bottom)`.

## Elevation & Depth

Hybrid, and physically motivated: light comes from above and slightly to the left, and every shadow
in the system is consistent with that one lamp. Recesses are `inset` shadows; objects that sit on
the board have offset shadows; objects that *hang* have shadows offset down and to the right of
their hook.

### Shadow Vocabulary
- **Recess** (`inset 0 7px 10px -4px rgba(0,0,0,.85)` plus symmetric side insets): the pigeonhole
  mouth, the photo plate, the plaque. Anything cut into the wood.
- **Hanging object** (`2px 7px 8px -4px rgba(0,0,0,.8), 1px 3px 2px -2px rgba(0,0,0,.55)`): key
  tags. The asymmetry is the whole point — it reads as suspended, not as placed.
- **Struck edge** (`0 3px 0 <brass-shadow>`): the primary button's thickness, which collapses to
  `0 0 0` on `:active` as the button travels 3px down.
- **Drawer** (`0 -18px 40px -10px rgba(0,0,0,.8)` with a `0 -2px 0` brass lip): sheets and cards
  rising over the board.
- **Engraved highlight** (`inset 0 1px 0 rgba(255,228,178,.13)` / `text-shadow: 0 1px 0`): the
  1px lit edge that turns a flat rectangle into a cut.

### Named Rules
**The One Lamp Rule.** Every shadow and every highlight agrees with a single light source above
and slightly left. A shadow pointing another way makes the whole board read as flat decoration.

**The No Halo Rule.** Zero-offset coloured glows are not part of this system. Depth is offset plus
blur, or it is an inset, or it is nothing.

## Shapes

Corners are small and machined: 5px on wood panels and the primary button, 3px on engraved plates,
2px on digit tiles, and `999px` on the language switch — the only true pill in the system, because
it is the only sliding mechanism.

The key tag is the one asymmetric silhouette: `5px 5px 9px 9px`, squarer at the top where it meets
the hook and rounder at the bottom where a hand wears it. It also carries a 9px drilled hole at top
centre. That silhouette plus that hole is the mark of the whole product.

Layers are `14px 14px 0 0` — rounded where they emerge, square where they meet the bottom edge.

Borders are used sparingly: a 1px brass hairline as a lip on a drawer or a rule inside the tally,
and a 1.5px bottom rule on form fields. There are no boxed cards and no nested containers anywhere
in the system.

## Components

### Buttons
- **Shape:** small machined radius (5px); full-width at 52px minimum height.
- **Primary (brass):** vertical brass gradient with a highlight at the top edge, engraved
  `#3A2A0C` label in uppercase PT Sans Narrow at 0.14em, sitting on a 3px `#5C441A` edge.
- **Active:** travels `translateY(3px)` and loses its edge shadow — the button is physically
  pressed, not tinted.
- **Disabled:** `grayscale(.65) brightness(.72)` — the metal dulls rather than fading out.
- **Engraved (secondary):** transparent brass wash on walnut, 1px `#5C441A` border, uppercase
  brass label. Used for the map action.

### Key Tag (signature component)
A brass plate hanging from a drawn hook inside a felt-lined recess, carrying a room number at
display size. While its layer is open the tag is `is-lifted` — it fades and rises out of the hook,
so the board behind shows an empty pigeonhole; `pop()` puts it back. The plate has a brushed micro-gradient, a diagonal specular skim deliberately kept
off the numerals, and a drilled hole the hook passes through. Each tag on a board is given its own
resting tilt via a `--tilt` custom property and its own specular angle and brass tone, so eight
tags read as eight objects rather than eight copies. Pressing a tag lifts it 4px and rotates it a
further 1.6° — composed with its resting tilt, never replacing it. A room with no number carries a
drawn key glyph instead of a word, because a word does not fit a plate.

### Cards / Containers
There are none in the card sense. Content sits in **recesses** (cut into wood, `inset` shadows) or
on **layers** (paper or walnut sliding over the board). A bordered rectangle floating on a
background is not part of this system.

### Inputs / Fields
- **Style:** no box. A 1.5px `#BFAD89` bottom rule on card stock, 44px minimum height, 16.5px PT
  Sans — a ruled line on a form, which is what it is.
- **Icon:** a drawn violet stamp glyph at the left, `pointer-events: none`, with the field's own
  control stretched invisibly over the full field so the icon is never a decoy.
- **Focus:** the rule shifts to stamp violet; the caret is stamp violet.
- **Error:** the rule shifts to `#A8321F` and a `role="alert"` line appears below, linked by
  `aria-describedby` with `aria-invalid` set on the input. Error copy names the problem *and* the
  recovery.

### Digit Tiles (signature component)
Quantities that can change — night counts, totals — are rendered as individual brass tiles, one per
digit, with non-digit runs (the currency word, an em dash) left uncut. When a value changes, only
the tiles whose digit actually changed flip in, on a 280ms `rotateX` fall. A number in this system
is a physical counter, never text that silently re-renders.

### Navigation
There is no nav bar. The board *is* the navigation and Telegram's own BackButton is the only back
affordance. Layers stack (`board → sheet → card`) and each layer sets `inert` on the ones beneath
it, moves focus into itself, and returns focus to the element that opened it.

### Date Stamp (signature component)
An authored SVG rubber stamp — double ring, arced hotel name, live arrival date — pushed through an
`feTurbulence` + `feDisplacementMap` ink-bleed filter, rotated −9°, `mix-blend-mode: multiply` at
50% opacity, and struck half off the right edge of the paper. It is overprinted, not laid out: it
overlaps whatever is beneath it and is `pointer-events: none`.

## Do's and Don'ts

### Do:
- **Do** give every new element a material: walnut, brass, or paper. If it fits none, the element
  is wrong.
- **Do** engrave small type: uppercase PT Sans Narrow, ≥0.17em tracking, 1px counter-light shadow.
- **Do** keep every shadow consistent with the single lamp above-left.
- **Do** slide new layers over the board and set `inert` on what is beneath, so the board stays
  mounted and the object stays continuous.
- **Do** vary repeated physical objects — tilt, specular, tone — so a set of eight does not read as
  eight instances of one component.
- **Do** show the visitor exactly what will be sent before it is sent.
- **Do** self-host every face with both Latin and Cyrillic subsets; this product ships in two
  scripts.

### Don't:
- **Don't** introduce a grey. Tint secondary text from its own ground instead.
- **Don't** wrap content in a bordered card. Cut a recess or raise a layer.
- **Don't** use gradient text, glass, or a zero-offset glow — none belong to wood, metal, or paper.
- **Don't** let brass appear on anything that is not actionable or countable.
- **Don't** state a fact the hotel has not confirmed. Amenities, ratings, occupancy limits,
  check-in times and cancellation policies are absent on purpose, and an empty section is the
  correct output when the truth is unknown.
- **Don't** call a booking confirmed. The vocabulary is *so'rov* / *заявка* — request — everywhere,
  including in the bot's replies.
- **Don't** hide a native control behind a drawn one. Stretch the real control over the field and
  draw on top of it.
