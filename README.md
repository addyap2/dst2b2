# DST 2 oral wheel

Exam wheel for the DST 2 oral (Bachelor 2, English B2): 12 themes with 6 questions each.

- Each spin draws a random question that has not been drawn yet, and the wheel lands on its theme.
- Drawn questions are saved in the browser, so reloading the page does not repeat them. **New exam session** puts every question back.
- **Put this question back** returns the last question to the wheel.
- Speaking timer (1–10 minutes), full-screen mode for the projector, and <kbd>Space</kbd> to spin.

The questions are in `public/questions.js`.

## Deploy

Static site with no build step. On Vercel, import the repository with the framework preset **Other**; `vercel.json` serves the `public` folder. Then add the domain in the project's **Settings → Domains**.

## Test

```bash
npm test
```
