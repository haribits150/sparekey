# SpareKey — Feature Breakdown (musings)

> Merged from the Google Doc "Core Concepts & Feature Breakdown" musings on 2026-10-09.
> These are raw brainstorming notes, not PM decisions. Each section carries a mapping note showing how it relates to the current docs (`docs/PR-FAQ.md` v7, `docs/MVP-SPEC.md`); anything that contradicts a standing PM call is flagged as tension, not adopted.

## Trust Circles & Access Control
- **Tiered audiences:** Direct Friends (Tier 1), Friends-of-Friends (Tier 2), and Vetted Communities (e.g., coworkers, alumni).
- **Granular visibility:** control who sees availability — e.g., full access for Tier 1, request-only for Tier 2.
- **Endorsement system:** mutual connections vouch for guests before bookings confirm.

⟶ Mapping: matches PR/FAQ's vouched guests (accountable vouching, 2nd-degree cap) and circle replication. Tiered visibility (request-only Tier 2) and vetted-community circles are new mechanics — not yet a PM call.

## Property Profiles & Availability Scheduling
- **Space spec & boundaries:** listing address (exact pin hidden until booking confirmed), parking details, off-limits rooms/closets, smart lock integration.
- **Trip/vacation scheduler:** set departure and return dates/times, with buffer periods for cleaning.
- **Schedule broadcasts:** automatically alert selected trust circles when a trip is scheduled (e.g., "Heading to Japan Nov 10–24; home is open to friends").
- **[P1] Co-living / Hosting While at Home:** mode to share extra bedrooms while present, specifying shared vs. private areas (kitchen, bath, living room).
- **Setting guest limit.**

⟶ Mapping: the scheduler and broadcasts are the "awareness layer" from PR/FAQ ("why not a group chat"); hidden pin, buffer periods, and guest limits are new detail. Smart lock integration is still open (see Open thread below). Co-living/while-home mode is new — PR/FAQ and MVP are away-only; flagged P1 by the author.

## House Rules & Expectations
- **Home manual:** wifi, thermostat, emergency manual, water, power, garbage.
- **Unintended damages:** pre-agreed protocol for accidental damage, repair thresholds, and designated emergency contacts (local handyman, plumber).
- **Pet & plant care:** guidelines and expectations if the host requires plant watering or pet sitting in exchange for staying.
- **Noise & community policies:** quiet hours, guest limits, HOA/building restriction compliance.
- **Consumables policy:** guidelines on kitchen staples, pantry items, toiletries, and replacement etiquette.
- **Turnover & cleanliness:** checklist for linen stripping, trash disposal, and return condition.

⟶ Mapping: manual sections map to the MVP spec's manual (rules, wifi, appliances, emergency, visitor_kit, checkout, extended_stay). New detail: water/power/garbage specifics, repair thresholds, emergency contacts, pet/plant care, consumables policy. The damages protocol is the MVP's notify-and-cover incident flow; repair thresholds are a new idea inside it. Cleanliness-first matches PR/FAQ's research finding (the #1 stay-killer).

## Waivers, Legal & Security
- **Digital liability waiver:** standardized host-guest release covering personal injury, property loss, and unforeseen cancellations.
- **House security:** safely share home security creds.
- **Security deposit / incidentals hold:** optional pre-authorization hold via payment processor.
- **Identity & network verification:** linked corporate email, phone, and mutual connection checks.

⚠️ Tension with standing PM calls: PR/FAQ deliberately has no deposits, no photo evidence, and no adjudication — the Honor Code plus one clear rule; the circle's curation is the trust mechanism. Captured here as musings, not adopted. Identity verification is unaddressed in current docs (the MVP has no login).

## Success Metrics
- Count of vacations supported / memories made
- Nights hosted
- Money saved

⟶ Mapping: money saved is the north star (Σ nights × nightly rate). Nights hosted and vacations supported are new leading indicators worth adding to the funnel (PR/FAQ currently tracks trips → listings → requests → stays → repeat hosts).

## Open Questions
- Does home warranty or house insurance get voided for these things?
- Is there a different category of insurance we need to get to support this?
- Micro insurance — short term.

⟶ Mapping: PR/FAQ's insurance FAQ covers the structural no-payment advantage (a non-paying friend is a houseguest, so the business-activity exclusion doesn't trigger) and v2 per-stay micro-insurance. The warranty-voidance question is still genuinely open — needs an answer from an actual insurer.

## Data Model Essentials
- **User:** id, name, verification_status, trust_network_ids
- **Listing:** id, host_id, address, rules_config, smart_lock_id, access_tier_required
- **Schedule / Window:** id, listing_id, start_date, end_date, mode (away_entire_home vs. present_co_hosting), status (broadcasted, booked, closed)
- **Booking / Agreement:** id, guest_id, listing_id, dates, signed_waiver_id, damage_deposit_status

⟶ Mapping: overlaps the MVP spec's prototype model (circle / listing / request / stay / manual / incident); the new fields here — access_tier_required, co-hosting mode, waiver/deposit status — are post-MVP design space.

## Open thread (from the musings)
The doc closed with a choice: incentive structure (reciprocal credits vs. paid stays vs. house-sitting exchanges) or the smart lock and check-in workflow.

⟶ Incentive structure is already answered in PR/FAQ v7: the reciprocity loop plus the scoreboard ("Airbnb without money" is the explicit anti-roadmap — paid stays would destroy the trust advantage). The smart lock & check-in workflow remains open; the musings only specify smart lock integration on the listing spec.
