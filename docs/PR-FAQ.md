# SpareKey — PR/FAQ (v7, 2026-10-09)

> Working title. Author: Hari (PM). Built with Muse (engineering).
> v2 changelog: bar-raiser critique round — designed the circle mechanics; added the reciprocity loop as the host incentive and growth story; unhappy-path protocol per PM call (notify + cover, no photo log); cold-start wedge; concierge deflection target + anti-hallucination rule; conversational onboarding; extended-stay ops; softened the hotel-price figure.
> v3 changelog: expansion strategy — circle replication over circle growth; vouched guests with accountable vouching; "Airbnb without money" named as the explicit anti-roadmap.
> v4 changelog: first user interview (Prem) — new insurance/big-damage FAQ with the no-payment structural advantage; "why an app" strengthened with the discovery insight; incident record added; cold-start reframed as circle replication vs customer acquisition.
> v5 changelog: second user interview (vishal) — trip-purpose segmentation (personal yes, business out of scope); 2nd-degree cap validated by research ("not comfortable sharing personal space" at 3rd/4th).
> v6 changelog: third user interview (Viveka) — cleanliness is the #1 stay-killer; visitor-kit checklist added to the manual spec; guest-ready standards as a first-class feature.
> v7 changelog: fun FAQ rewritten per PM call — restocked fridge removed; added the living-guestbook mechanic (guests add one line to the manual for the next guest).

---

## Press Release

**SpareKey lets you lend your empty home to trusted friends — and shows exactly how much hotel money they saved**

Bellevue, WA — Your home sits empty when you travel. Meanwhile, your close friends pay hotel prices when they visit town. SpareKey fixes the mismatch: post the dates you're away, and only people you've personally added to your circle can see the listing and request to stay. No strangers, no payments, no awkward group texts.

Here's how it works: you mark your home "available" for the dates you're gone — as far ahead as you like, whether that's next weekend or a three-week trip to India — and chat with the AI for a couple of minutes about your place. It drafts a complete house manual — wifi, parking, thermostat quirks, house rules, and an extended-stay section for long trips (mail, plants, trash day) — and acts as a concierge that answers your guests' questions while you're away, so you don't get texted at midnight about the dishwasher. Every guest agrees to one simple Honor Code first: treat this home like your own. And when your friends travel, you might be the guest — today's host is tomorrow's guest.

"I built SpareKey because my home was sitting empty on every trip while my friends were paying for hotels ten minutes away," said Hari. "The trust was never the problem — we already trust each other. The problem was the coordination."

[Guest quote — TBD after the first dogfood stay.]

SpareKey is invite-only by design. There are no public listings, no reviews, no payments — just your circle, your home, and a counter that keeps score of the money your friends kept.

---

## FAQ

**What problem does this solve?**
Two at once: (1) Homes sit empty while owners travel — wasted space. (2) Close friends visiting the area pay hotel prices. The coordination today happens over awkward texts ("hey, would it be weird if...?"), and the handover is a brain-dump of house quirks. SpareKey makes the offer explicit and the stay self-serve.

**How does the trusted circle actually work?**
You curate a list of people — your circle. Only they can see your listings, and every stay still needs your explicit approval: it's a request, not a booking. Guests can't invite others; only you add to your circle, and you can remove anyone anytime (removal cancels their pending requests and hides future listings). Design rationale: the circle is the product's trust infrastructure. Making it explicit, bounded, and revocable is what lets everything else — no deposits, no reviews, no insurance — stay simple.

**Why trusted circle only? Why not open it up like Airbnb?**
Because the circle is the entire product insight. Open home-sharing needs reviews, deposits, insurance, and dispute resolution — that's Airbnb's business, not ours. Among people you choose and can remove, all of that evaporates. (See "How does the trusted circle actually work?" for the mechanics.)

**Why would I bother listing my home?**
Three reasons, strongest first:
1. **Reciprocity.** Today's host is tomorrow's guest. The circle is a mutual-aid network — lending is how you earn stays. "I lend mine in Bellevue, I stay at yours in Austin."
2. **The scoreboard.** Seeing "you've saved your friends $2,140" is genuinely satisfying — generosity with a receipt.
3. **It's low effort.** The AI writes the manual and the concierge fields the questions. Your total work is approving the request.
This is also the growth story: every guest added to a circle is a future host. The network builds itself one stay at a time.

**Why not just a group chat?**
A group chat doesn't remember your house manual, can't answer guest questions at 11pm, doesn't track availability dates, and can't show you the scoreboard. And the most basic problem, from our first user interview: most friends don't even know when you're traveling. The app is an awareness layer first — *who's away when* — plus coordination and memory. SpareKey turns a favor into a system.

**Where does the AI come in?**
Two places, both in the MVP:
1. **House manual generator** — instead of a form, the AI *interviews* you about your place for a couple of minutes ("tell me about your kitchen quirks") and drafts a complete, friendly guest manual: house rules, wifi, appliances, emergency info, checkout checklist, a guest-ready section (visitor kit: fresh towels, bedsheets, pillows, napkins — plus a pre-arrival cleanliness check), and an extended-stay section (mail, plants, trash day) for multi-week trips.
2. **Guest concierge** — during the stay, guests ask the AI questions about the home instead of texting the host. Target: it resolves 80%+ of questions without involving the host. Anti-hallucination rule: it answers only from the house manual, cites the section, and "I don't know — let me ask your host" is always an acceptable answer. A wrong answer about someone's home is worse than no answer.

**What does it cost?**
Nothing. No payments flow through SpareKey — this is friends helping friends, and the scoreboard is the reward. (On whether it could ever make money, see "How could SpareKey make money?" below.)

**How could SpareKey make money?**
Honest answer first: the stay itself must stay free. Charging friends for the bed turns SpareKey into Airbnb with extra steps and destroys the trust advantage the whole product is built on. The credible paths monetize *around* the stay, not the stay:
1. **Stay services (strongest):** cleaning coordination between guests, key handoff — real pain on multi-week lends, and nobody feels weird paying a cleaner.
2. **Premium for power hosts:** people juggling multiple properties or frequent long trips get advanced scheduling and richer savings analytics. Narrow audience, but real.
3. **Affiliates:** travel insurance for the host's own trip. Low value; listed for completeness.
For the MVP and the portfolio story, SpareKey is free. Monetization is a v2 conversation — but having the answer ready now is what makes this a complete PM artifact.

**What about damage or mess between friends?**
Simple protocol, agreed up front: if something happens, the guest notifies the host in the app and covers the cost. The app keeps a shared incident record — what happened, the agreed resolution — so nothing relies on memory or "whose word." No deposits, no photo evidence, no adjudication: the Honor Code plus one clear rule. This works because the circle is curated and revocable; if you can't trust someone to own up to a broken vase, they shouldn't be in the circle. The product's job is making the rule explicit *before* the stay, not enforcing it after. (Deliberately no pre/post photo ritual — PM call: keep it simple.)

**What about insurance and really big damage?**
Honest answer: this is the real tail risk, and our first user interview surfaced it. A big leak or structural damage exceeds what "notify and cover" can handle, and nobody wants a claim on their homeowner's policy raising premiums for years. Three layers:
1. **Inner circle only** — the adverse-selection defense. Strangers cause the catastrophic cases; curation is the primary insurance.
2. **Structural: no money changes hands.** Standard homeowner's policies void coverage for *paying* guests via the business-activity exclusion — the exact trap Airbnb-style hosting falls into. A non-paying friend is a houseguest, not a commercial operation, so that exclusion doesn't trigger. (Confirm with your own insurer — it's a structural advantage, not a guarantee.)
3. **v2: per-stay micro-insurance.** A lightweight optional cover for the catastrophic tail — explored only after the core loop works. Note this is also adjacent to the services monetization path.
Small incidents stay off insurance entirely *because* the guest covers them — which is exactly why the notify-and-cover protocol exists.

**What's the Honor Code?**
One sentence every guest accepts before a stay: *"Treat this home like your own."* It's the social contract that replaces the deposits, reviews, and insurance that open marketplaces need. SpareKey surfaces it at the two moments it matters most: arrival and the checkout checklist.

**How do you keep it fun?**
Delight is opt-in, never required — making gratitude mandatory would turn a favor into a transaction, which is exactly what this product exists to avoid. Three lightweight touches:
1. **Thank-you, your way** — a note, a small gift. Suggested, never tracked.
2. **The manual grows a memory** — guests can add one line to the house manual for the next guest ("the sunset from the deck is unreal — Priya"). Over stays, the manual becomes a living guestbook no hotel or Airbnb listing has.
3. **The scoreboard celebrates** — "together we've saved friends $2,140" is the shared win.

**How far in advance can I list my home?**
As far as you want — there is no listing window. This is deliberate: the highest-value stays are multi-week trips (a month in India, a long work assignment), and those are planned months ahead. Post your dates the day you book your flights; friends planning visits can line up early instead of discovering the overlap too late. Hosts can also save recurring patterns ("I'm usually away every December"). Later idea (v2, not MVP): guests post their own travel plans ("I'll be in Seattle Oct 20–27") so hosts get matched instead of the other way around.

**Can the network grow beyond my circle?**
Yes — but by replicating circles, never by merging them into a marketplace. Two mechanisms:
1. **Vouched guests.** A circle member can vouch for someone outside it ("my cousin Ravi"). The vouch is accountable: if Ravi has an incident, it counts against the member who vouched, not just Ravi. Trust stays transitive, *and* someone always has skin in the game. **Capped at 2nd degree** — per user research, 3rd/4th-degree connections trigger "not very comfortable sharing personal space." Trust decays with degrees; the product encodes the decay instead of fighting it.
2. **Circle replication.** You never browse strangers' homes. New circles form when a guest becomes a host. The product grows like WhatsApp groups — thousands of private circles — not like a public square.
**The guardrail:** the day SpareKey lets you book a stranger's home is the day it becomes Airbnb without money — all of Airbnb's trust, safety, and dispute costs with none of its revenue to fund them, plus free-tier adverse selection. That's the failure mode, so it's the anti-roadmap, stated explicitly: no public listings, no city search, no stranger stays, ever. Scale the number of circles, not the size of circles.

**How does this get off the ground?**
The wedge is embarrassingly small: Hari plus five friends, triggered by his next trip. No public launch, no marketing — the first circle forms around one real stay, and every guest in that stay is a future host with their own circle. Second circle: a friend's trip. Invite-only products die in empty rooms, so the doc names the room: five people, one trip, one stay. On the "getting customers" hurdle: SpareKey doesn't acquire customers, it replicates circles. Each circle is self-sustaining — there's no marketplace liquidity to bootstrap.

**What's the #1 reason someone says no?**
Cleanliness — not trust, not insurance. Per user research, the top rejection reason is "if the house is not clean or linen is not clean." Unsexy, decisive: nobody books a second stay in a place with questionable sheets. So guest-ready standards are a first-class feature, not an afterthought: the AI-generated manual includes a **visitor kit** checklist (fresh towels, bedsheets, pillows, napkins) plus a pre-arrival cleanliness check. For hosts who can't prep it themselves, cleaning coordination is the v2 services path (see monetization). The lesson: the biggest risk to this product isn't a broken vase — it's a stale pillowcase.

**How do you measure success?**
North star: **total dollars saved for friends** = Σ (nights stayed × nightly rate, host-set). Counter-metrics: host satisfaction after each stay ("would you lend again?"), and concierge deflection rate (did it actually keep the host's phone quiet?). Leading indicators for the funnel: trips → listings → requests → stays → repeat hosts. Note: some stays are trips that wouldn't have happened at all — that's value *created*, not just saved. The north star counts avoided hotel spend; the real number is bigger.

**What's deliberately NOT in the MVP?**
Payments, public listings, swaps/exchanges, reviews/ratings, insurance, multi-home property management, guest-posted travel plans. If a feature needs strangers to make sense, it doesn't belong here.

**Who is this for, exactly?**
Homeowners who travel and have close friends/family who visit their city — for **personal trips**. Trip purpose segments sharply, per user research: personal/leisure travel is the core ("yes, but only on personal trips"); business travel is out of scope (the company pays, and proximity to the office beats savings). The first user is the PM himself — dogfooded from day one, first circle: five friends, first trigger: his next personal trip.

---

## Open questions
- **Platform:** mobile web vs. native app for the MVP demo (leaning mobile web — fastest to a demoable link).
- **Nightly rate:** host-set per stay vs. defaulting to a local average. Host-set is more honest; a local-average default is less work.
