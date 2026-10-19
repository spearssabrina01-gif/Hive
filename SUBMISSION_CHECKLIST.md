# Amazon Hive — Submission Checklist

**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon (Devpost)
**Primary track:** Ring (priority categories: access control, caretaking)
**⏰ DEADLINE: Friday, October 23, 2026 at 12:00 PM Pacific Time** — noon, *not*
midnight. Judging period: Nov 9–20, 2026. Winners announced on or around Dec 3, 2026.
Requirements verified Oct 1, 2026 against the official rules:
https://amazonappdev2026.devpost.com/rules and https://amazonappdev2026.devpost.com/

## Required by the official rules

- [ ] **Devpost registration** — click "Join Hackathon" on
      amazonappdev2026.devpost.com and complete the "Enter a Submission" form.
      **NEEDED — Sabrina, needs your Devpost account. Nothing is submitted yet.**
- [x] **Working project in a primary track** — the Hive demo runs end-to-end
      locally (`npm start`, demo UI at localhost:3000); integration tests have
      passed 9/9. Ring track allows a simulator — a physical Ring device is NOT
      required.
- [x] **Track technology used at runtime in code** (rules require it to be
      imported and actually called, not just named in the README) — real MCP
      server invoked over HTTP, real Ring webhook receiver with HMAC
      verification. DONE in code.
- [ ] **Text description** — explain features and functionality.
      **DRAFT DONE** in `WRITEUP_DRAFT.md` (this folder). Still needed: paste
      into Devpost and give it a final read.
- [ ] **Code repository on GitHub** with all source, assets, and setup/run
      instructions. Must be EITHER:
      - public with a detectable open-source license file visible at the top
        of the repo page, OR
      - private, shared with **testing@devpost.com** AND the Amazon team
        (GitHub collaborators: chris-trag, knmeiss, giolaq, anishamalde,
        mosesroth, emersonsklar).
      **NEEDED — repo not pushed yet; package.json says MIT but there is no
      LICENSE file yet. Sabrina decides: public vs. private.**
- [ ] **Demo video** — **under 3 minutes** (judges are not required to watch
      past 3:00), in English, **publicly visible on YouTube or Vimeo**, link
      pasted into the submission form. Must show the project functioning; no
      third-party trademarks or copyrighted music without permission.
      **NEEDED — not recorded yet.**
- [ ] **Product feedback for every tool/API/SDK used** — which tools and for
      what, what worked well, what needs work, onboarding experience, and
      "would you build with these again? Yes/No + why."
      **DRAFT DONE** — see the Product Feedback section of `WRITEUP_DRAFT.md`.
      Still needed: paste into Devpost, Sabrina to confirm tone/facts.
- [ ] **Primary track selection on the form** — select **Ring**. (Decided;
      just needs doing at submission time.)
- [ ] **Images / screenshots for the submission gallery** — the rules note
      judges may judge from the text description, **images**, and video alone.
      **NEEDED — capture: demo home, 5-step run, Brain Dump dashboard,
      Focus Mode PiP, MCP inspector.**
- [ ] **Testing access for judges** — project must be accessible and free of
      charge through the end of judging (Nov 20, 2026); if anything is
      private, include testing instructions/credentials on the form.
      **NEEDED — add judge run instructions (clone → npm install → npm start
      → npm test) to the repo README and the Devpost testing field.**

## Optional but valuable

- [ ] **Friction log entries** (optional in the form) — specific task, steps,
      expected vs. actual, severity, workaround, suggestion. Rules state
      friction logs can earn up to a **10% judging bonus**. Draft material is
      in the writeup's feedback section. RECOMMENDED.
- [ ] **Feature requests** (optional) — description, why it matters, priority
      (Critical / Important / Nice-to-have). Candidates: Ring familiar-face
      signal in the Partner API; a supported write path to Bee daily notes.
- [ ] **AWS $150 promotional credits** — requestable by registered entrants
      until **Oct 21, 2026, 12:00 PM PT** (form in the rules). Only if we host
      anything on AWS; v1 is local/free-tier, so probably skip.
- [ ] **Mini challenges** — AWS Builder: NOT currently eligible (no AWS
      services used; Kiro Crew use alone would qualify — only claim if true).
      Open Source: only if Sabrina chooses the public-repo route AND files the
      extra fields (contribution URL, repo URL, GitHub username, description).
      Decide before submitting; do not claim either by default.

## Eligibility / rules sanity checks

- [x] Entrant is an individual of age of majority, US-based — eligible.
      (Hackathon is closed to residents of Brazil, Quebec, Russia, Cuba, Iran,
      North Korea, and other US-sanctioned countries — not applicable.)
- [x] All submission materials in English — required by the rules.
- [x] Project is new / built during the Submission Period (Aug 31 – Oct 23,
      2026) — yes.
- [x] Original work, no third-party IP violations; no Sponsor/Administrator
      funding or preferential support — yes.
- [ ] Before final submit: confirm the demo still runs from a clean clone and
      the video matches what the description claims (rules: project "must be
      shown functioning in the demonstration video, as depicted").

## Summary — what's actually left

1. Sabrina: Devpost account + registration (only she can do this).
2. Decide public vs. private GitHub repo; add LICENSE file if public; push.
3. Record the under-3-minute demo video; upload public to YouTube/Vimeo.
4. Capture 4–5 screenshots for the gallery.
5. Paste write-up + product feedback drafts into the Devpost form; select
   Ring track; add judge testing instructions.
6. Optional: friction log (up to 10% bonus) + feature requests.
7. Final review → submit **before Oct 23, 2026, 12:00 PM PT**.
