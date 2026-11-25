# DST 2 oral wheel

Exam wheel for the DST 2 oral (Bachelor 2, English B2): 12 themes with 6 questions each.

- The supervisor chooses the student’s theme, then spins a wheel numbered 1 to 6 to draw one of that theme’s questions.
- Every spin is random, so a question can be drawn again.
- The interface is in French; theme names and questions stay in English.
- Press <kbd>Space</kbd> to spin. The wheel ticks as each peg hits the pointer; **Son** turns the sound off or on (remembered in the browser).

The questions are in `public/questions.js`.

## Deploy

Static site with no build step. On Vercel, import the repository with the framework preset **Other**; `vercel.json` serves the `public` folder. Then add the domain in the project's **Settings → Domains**.

### Login

`middleware.js` puts the whole site behind a login page (questions included). Set these in the Vercel project under **Settings → Environment Variables**, then redeploy:

| Name | Value |
| --- | --- |
| `DST_USER` | the username |
| `DST_PASSWORD` | the password |

They are kept out of this repository on purpose. Until both are set, the site shows a "not configured" page and stays locked. A successful login lasts 12 hours on that browser. The username ignores capitals; the password does not.

## Test

```bash
npm test
```
