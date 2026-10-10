# SpareKey MVP Spec (Week 2)

> Status: draft for PM red-pen. Prototype scope: one hardcoded circle, happy path + incident flow, demoable on mobile web.

## What we're building
A working prototype that walks the full core loop: host posts away dates → guest requests → host approves → AI builds the house manual → concierge answers guest questions → checkout → scoreboard. Everything from the PR/FAQ that isn't in this loop is out.

## User stories
1. **Post availability (host):** pick date range, set nightly hotel rate (host-set — simplest honest input), write one line about the place. Listing is visible to circle members only.
2. **Request a stay (guest):** browse listings, tap request, add dates + note. Accept the Honor Code ("treat this home like your own") as part of the request.
3. **Approve / decline (host):** see requests, approve or decline with one tap. Approval creates the stay.
4. **AI manual interview (host):** the AI asks 3–5 questions about the place (kitchen quirks, wifi, parking, house rules) and drafts the manual: house rules, wifi/appliances, emergency info, **visitor kit checklist** (fresh towels, bedsheets, pillows, napkins), pre-arrival cleanliness check, checkout checklist, extended-stay section (mail, plants, trash day). Host edits before publishing.
5. **Concierge (guest, during stay):** ask questions in plain language. Answers come only from the manual, cite the section, and "I don't know — let me ask your host" is always acceptable. Target: 80%+ resolved without host involvement.
6. **Checkout + incident (guest/host):** guest runs the checkout checklist; if something broke, files the incident report (what happened + agreed resolution — notify-and-cover). Host confirms. Stay closes, scoreboard updates: **$ saved += nights × nightly rate**.

## Data model (JSON file — no database for the prototype)
- `circle`: members[] (hardcoded: Hari + 5 friends)
- `listing`: id, host, start/end dates, nightly_rate, note, status
- `request`: id, listing_id, guest, dates, note, honor_code_accepted, status
- `stay`: id, request_id, manual_id, status
- `manual`: sections (rules, wifi, appliances, emergency, visitor_kit, checkout, extended_stay, guestbook[])
- `incident`: id, stay_id, description, resolution, status

## AI components
- **Manual generator:** conversational interview → structured markdown manual. (Week 3: eval set of 10 sample interviews graded on completeness + tone.)
- **Concierge:** retrieval over the manual text + system prompt with the citation and fallback rules. (Week 3: eval set of 20 questions incl. 5 unanswerable-from-manual — must say "I don't know," never hallucinate.)

## Tech
- Python + Streamlit, mobile-friendly layout. Data in a local JSON file.
- No login, no payments, one hardcoded circle — prototype constraints, stated up front.
- Demo deployment: Streamlit Community Cloud (free) for a shareable link.

## Non-goals (from the PR/FAQ)
Vouched 2nd-degree guests, micro-insurance, guest-posted travel plans, cleaning booking, multi-property support, public listings of any kind.

## Acceptance criteria (the demo script)
1. Hari posts "away Nov 20–Dec 5" with a $180/night rate in under a minute.
2. A friend requests 4 nights, accepts the Honor Code.
3. Hari approves; the AI interview produces a manual with the visitor-kit checklist.
4. The friend asks 5 questions (wifi, parking, checkout time, "can I bring my dog?" — unanswerable, must deflect); 4 answered from the manual, 1 clean "I don't know."
5. Checkout completes; an incident ("chipped a mug") is filed and resolved via notify-and-cover.
6. Scoreboard shows $720 saved. The loop is visibly complete.

## Open decisions for Hari (PM calls)
1. **Nightly rate:** host-set per listing (recommended — honest, simple) vs. defaulting to a local average.
2. **Demo data:** fictionalized home details (recommended — the repo may go public for the LinkedIn portfolio; real address/wifi details should never be in git).
