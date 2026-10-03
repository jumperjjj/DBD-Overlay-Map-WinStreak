DBD Overlay Studio — Beta 2.0.6 TEST PATCH

Victory effect rebuilt to fix the Beta 2.0.5 regression.

Sequence after a match victory (20 seconds total):
- 0–5s: VITÓRIA / WIN / VICTORIA replaces the winner timer, with pulse + light burst.
- 5–10s: final winner timer returns and pulses.
- 10–15s: victory label returns, again without the timer underline.
- 15–20s: final winner timer returns and pulses.
- After 20s: normal static result.

The winner name pulses for the full 20 seconds.
Victory sound plays only once, at the moment the match is won.
The timer underline/active rail is hidden only while the victory label is visible.
