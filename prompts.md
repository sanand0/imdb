# Prompts

## Add outliers, 30 Jun 2026

<!--
cd ~/code/imdb/
dev.sh -- codex --yolo --model gpt-5.5 --config model_reasoning_effort=medium
-->

<!-- https://chatgpt.com/c/6a4324cd-a4d8-83ec-bcdd-57a5e2c223c3?mweb_fallback=1 -->

Modify the script to also write a `hull` object into `info.json`, containing only movies on the upper-right convex hull of `log10(Votes)` vs `Rating`.

Use only NumPy/Pandas; do not add SciPy. After `movies` is created and columns are renamed, add a function that:

1. Drops rows with missing/non-positive `Votes` or missing `Rating`.
2. Computes `x = log10(Votes)` and `y = Rating`.
3. Builds the 2D upper convex hull using a monotone-chain algorithm.
4. Keeps only the chain from the highest-rated hull point to the rightmost/highest-vote hull point.
5. Returns the matching movie rows, sorted by `Votes` descending.
6. Writes them to `hull.csv` in `info.json`.

Preserve the existing `movies.csv` and `info.json`'s `updated` behavior. Keep the implementation small, readable, efficient, and deterministic.

Then, modify index.html minimally to add a toggle that highlights the hull movies in the scatter plot by adding a .hull class (e.g. with a 1px border - dark-mode aware) around the cells that are on the hull. The toggle should be off by default. Use only existing JS libraries; do not add new ones.

Run and test. No test cases required.

---

A few changes:

- Instead of a sliding toggle, make it a button toggle with the word "Outliers".
- Change the key and all references from "hull" to "outliers".
- I want the top and right outer edges, actually. Maybe I mis-specified. I want Planet Earth II as a hull at the top because it's on a cell where the cell to the left and right have no cell with a higher rating above. Same for Blue Planet II and Outer Planet, Cosmos and Bluey. Steel Ball Run: JoJo's Bizarre Adventure qualifies too. So does BB Ki Vines. On the right, we want movies that are on cells where the cells above and below have no higher vote cells to the right. For example, Snow White (certainly), Radhe, Fifty Shades of Grey, but not Avatar (because the cell above has The Avengers with more votes)

---

Wait, the envelope can be just as easily computed on the front-end JavaScript. That might be more efficient, and we don't need to change the server-side code at all.
If that's right, move the implementation purely to the front-end.

---

Modify the Python script and the GitHub action to also append to an "outliers/YYYY.tsv" file that is appended to and committed every week with the columns: `Date`, `ID`, `Rating`, `Votes`, `Year`, `Title`, `Genre`, `Type`. `Date` is the date when the script runs - as `YYYY-MM-DD`. Column headers are not require in the TSV. The `YYYY` is the year of the run - same as `Date`.

Keep changes minimal.
Run and test.

--- <!-- Steering -->

Use a `data/` branch instead of the main branch to commit the outliers/

---

Deploy and test and see if it works. Let me know if you need me to do something (e.g. if you don't have permissions.)

<!-- codex resume 019f165a-07d8-7e43-b796-93395c4dc5e7 --yolo -->
