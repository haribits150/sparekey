# SpareKey

**Lend your empty home to trusted friends — and count the room nights.**

🔗 **Live:** https://haribits150.github.io/sparekey

When you travel, your home sits empty. Meanwhile your close friends pay hotel prices when they visit town. SpareKey fixes the mismatch: post the dates you're away, and only people you personally trust can request to stay. No strangers, no payments, no awkward group texts.

- **North star:** total room nights hosted for friends
- **AI inside:** a house-manual generator (2-minute host interview → structured manual) and a guest concierge that answers questions *only* from the manual — so the host never gets a midnight text about the dishwasher
- **Design constraint:** invite-only trusted circle. If a feature needs strangers to make sense, it doesn't belong here.

## The loop

1. **Host** posts away dates → **friend** requests to stay → host approves
2. **AI** interviews the host (2 min) and drafts the house manual → host reviews and publishes
3. **Guest** asks the AI concierge anything about the stay — answers come from the manual with section citations, or it honestly says it doesn't know
4. Checkout runs a checklist (plus incident reporting) → the night lands on the circle's **scoreboard**

## What user research changed

Three friend interviews before a line of production code was written — each one reshaped the product:

| Interview | Insight | Product change |
|---|---|---|
| Prem | Trust is the whole product; insurance/liability questions | "No strangers, ever" as a hard constraint; invite-only circles |
| vishal | Personal trips ≠ business trips; trust doesn't extend past 2nd degree | Trip segmentation; 2nd-degree trust cap |
| Viveka | Cleanliness standard: clean house, clean linen | Visitor-kit checklist became a first-class manual section |

## Key product decisions

- **PWA on GitHub Pages, not native, not Vercel.** One codebase, installable, zero hosting cost, deploys from `main` with no build step.
- **Firebase over Supabase.** Realtime Database's JSON tree maps 1:1 onto the app's store — and unlike Supabase's free tier, it never sleeps (bad look for a shareable demo link).
- **Google login, not Facebook.** Facebook login was possible, but Facebook killed full friend-list access years ago (an app only sees friends who also use it) — so "import your friends" was a dead end. Invite codes fit the trust model better anyway.
- **Room nights, not dollars saved.** The original north star was hotel dollars saved; counting nights hosted turned out to be the more honest metric.
- **No backend server.** Static frontend + Firebase Auth + Realtime Database + security rules. Server-side rules enforce the core promise: you can only read/write circles you're a member of.

## AI design

Deliberately **no LLM** in the loop. The manual generator is template-based (interview answers → structured sections: rules, wifi, appliances, parking, emergency, visitor kit, checkout), and the concierge is retrieval-based (keyword matching with word boundaries + phrase bonuses, section citations on every answer). The anti-hallucination guarantee holds *by construction*: the concierge cannot say anything that isn't in the manual, and deflects out-of-manual questions to the host.

## Evals

Every behavior that matters is pinned by a test. **107 checks, all green:**

| Suite | What it proves | Result |
|---|---|---|
| Acceptance (16) | Full loop end-to-end | ✅ |
| Edge cases (7) | Empty states, bad input, guest/host boundaries | ✅ |
| Concierge eval (20) | 15 questions resolve to the right manual section with citation; 5 unanswerable ones deflect | ✅ |
| Manual-generator eval (21) | 10 sample interviews produce complete, structured manuals | ✅ |
| Sync (9) | Cloud/local translation round-trips; invite codes; collision-free IDs | ✅ |
| Auth flow (8) | Login → circle → sign-out, header states | ✅ |
| Full loop, two phones (18) | Listing → request → approve → interview → publish → concierge → checkout → scoreboard, synced live | ✅ |
| Robustness (8) | Every screen renders in offline + cloud modes, including partial data | ✅ |

The evals earned their keep: the concierge suite caught substring-matching bugs ("how do I get *internet*?" routed to house rules via "get *in*"), and the robustness suite caught a real production freeze — Firebase strips empty arrays on write, which crashed every screen render until the sync layer learned to default missing keys.

Run them: `npm install --no-save jsdom` then `node test/<suite>.test.js`

## Architecture

```
GitHub Pages (static: index.html + styles.css + app.js)
    ├── Firebase Auth (Google sign-in)
    └── Realtime Database (per-circle JSON: listings, requests, stays,
        manuals, incidents, score) + security rules (members-only access)
```

No build step, no server. The app is live with Google login and shared realtime circles; without `firebase-config.js` it falls back to local-only storage.

## Status & roadmap

Built as a 4-week learn-by-building AI PM program: Week 1 define (PR/FAQ, metrics, 3 user interviews), Week 2 build the AI core, Week 3 evals/guardrails/demo UI, Week 4 ship & showcase. The shared backend (originally a "someday" milestone) got pulled forward so the loop runs across real phones.

- [x] Live prototype with Google login + shared realtime circles
- [ ] Two-phone field test with real friends
- [ ] Demo video + LinkedIn showcase posts
- [ ] PR/FAQ + spec refresh (north star: dollars → room nights)

## Docs

- `docs/PR-FAQ.md` — Amazon-style PR/FAQ: problem, solution, metrics, explicit non-goals
- `docs/MVP-SPEC.md` — MVP spec: core-loop user stories, data model, AI components, demo script
- `docs/feature-breakdown.md` — feature musings: trust tiers, property profiles, house rules, legal/security
- `database.rules.json` — Realtime Database security rules
