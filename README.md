# SpareKey

**Lend your empty home to trusted friends — and show exactly how much hotel money they saved.**

When you travel, your home sits empty. Meanwhile your close friends pay hotel prices when they visit town. SpareKey fixes the mismatch: post the dates you're away, and only people you personally trust can request to stay. No strangers, no payments, no awkward group texts.

- **North star:** total dollars saved for friends (nights stayed × local hotel rate)
- **AI inside:** house-manual generator + guest concierge that answers questions from the manual, so the host never gets a midnight text about the dishwasher
- **Design constraint:** invite-only trusted circle. If a feature needs strangers to make sense, it doesn't belong here.

## Status

Week 1 of a 4-week learn-by-building AI PM program. Currently: problem definition.

- [x] PR/FAQ v0 — `docs/PR-FAQ.md` (awaiting PM red-pen)
- [ ] User research: 3 friend interviews
- [ ] GitHub repo live
- [ ] MVP spec (Week 2)

## Docs

- `docs/PR-FAQ.md` — Amazon-style PR/FAQ: problem, solution, metrics, explicit non-goals
- `docs/MVP-SPEC.md` — Week 2 MVP spec: core-loop user stories, data model, AI components, demo script
- `docs/feature-breakdown.md` — feature musings merged from the Google Doc: trust tiers, property profiles, house rules, legal/security, data model, mapped against current docs
- `docs/user-research-outreach.md` — WhatsApp script for the 3 friend interviews

## Prototype

A mobile-friendly static web app implementing the MVP spec lives at the repo root: `index.html` + `styles.css` + `app.js`. No backend — state persists in `localStorage`, and the manual interview + concierge are simulated per the spec (the concierge answers only from the manual text, so the anti-hallucination rule holds by construction).

Run it locally: open `index.html`, or `python3 -m http.server` in the repo root and visit the printed URL.

Tests: `npm install --no-save jsdom && node test/acceptance.test.js && node test/edge.test.js` — the acceptance suite walks the full demo script from `docs/MVP-SPEC.md` (14 checks, all green).

Deploy: any static host works — Vercel, Netlify, or Cloudflare Pages pointed at the repo root. Note: the repo is private, so GitHub Pages would need a paid plan; the three above serve private repos on their free tiers.
