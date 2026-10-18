---
description: Roast an idea with the 4-agent council (Believer, Skeptic, Investor, Judge)
argument-hint: <your idea>
---
Run the council on this idea:

$ARGUMENTS

If no idea was given, ask for one and stop. First read `council/verdicts.md` for any earlier verdict on this idea and pass it along as context.

Run the agents strictly in order, one at a time, each with the full idea and every earlier agent's output verbatim:
1. `council-believer` with the idea.
2. `council-skeptic` with the idea + the Believer's case.
3. `council-investor` with the idea + Believer + Skeptic.
4. `council-judge` with the idea + all three arguments (+ any earlier verdict). It saves the verdict to `council/verdicts.md`.

Then show me each agent's argument under its own heading, and finish with the Judge's verdict.
