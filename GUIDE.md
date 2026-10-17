<div align="center">

<img src="assets/providence.svg" width="300" alt="">

# 🕷 The Night-Shift Guide

### Raise a spider that watches your repo while you sleep. 5 minutes, 0 dependencies.

</div>

---

## Night 0: meet it (30 seconds)

```bash
cd ~/code/your-repo
npx github:SpikeCalls/PRovidence night
```

That's it. It has crawled, hunted, built a second brain and written `.providence/MORNING.md`.
**Nothing in your repo changed.** The first night is always read-only.

Add this so the spider's notes don't end up in your commits:

```bash
echo ".providence/" >> .gitignore
```

---

## Night 1: read the morning report (1 minute)

Open `.providence/MORNING.md`. It always has the same five parts:

| section | what it means |
|---|---|
| **Fixed** | reproduced → fixed → reproduced again and now passing |
| **Left for you, with evidence** | real or suspected bugs it is *not allowed* to fix alone |
| **Second brain** | how many notes and links it farmed tonight |
| **Safety web** | the hard limits that held |
| **What did I not see?** | its own blind spots, written down by the spider itself |

> 💡 Read the last section first. It's the most honest thing a tool will ever tell you.

---

## Night 2: let it weave (1 minute)

The spider refuses to write on `main`. That's a feature:

```bash
git switch -c night-shift/$(date +%F)
npx github:SpikeCalls/PRovidence fix --apply
git diff            # see exactly what it wove
```

Only **mechanical, provably-safe** fixes get applied, and each one goes through the loop:

```
reproduce  →  fix  →  reproduce again  →  still failing?  →  roll back
```

Happy? Open the PR yourself. **You** are the operator. It waits for you.

---

## Night 3: put it on the night shift (2 minutes)

Create `.github/workflows/night-shift.yml`:

```yaml
name: night-shift
on:
  schedule: [{ cron: '7 1 * * *' }]   # 01:07 every night
  workflow_dispatch:
permissions:
  contents: read
jobs:
  night:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: SpikeCalls/PRovidence@main
        with:
          fail-on-critical: true
```

Every morning: **Actions → night-shift → Summary** = your report.
If someone commits a token or a `<<<<<<<` marker, the run goes red before your coffee does.

---

## Night 4: farm the second brain

```bash
npx github:SpikeCalls/PRovidence brain
```

Open `.providence/brain/` as an **Obsidian vault** → graph view.
You'll see your repo as a web: modules, the files that hurt, and every bug as a node.
Red nodes are critical. Keep going until the graph is boring.

---

## Night 5: dress it up 🎩

```bash
npx github:SpikeCalls/PRovidence hats          # the wardrobe
npx github:SpikeCalls/PRovidence hat crown     # try one on
npx github:SpikeCalls/PRovidence night --hat wizard
```

Then go play **[PRovidence Quest](https://spikecalls.github.io/PRovidence/quest/)** on your own contribution graph.
Type your username. Every empty week is a pit. Don't fall into your vacation.

---

## 🎬 Make your own spider post (the viral part)

Everything you saw in the videos is reproducible from this repo:

1. **The website steals letters.** Open [the site](https://spikecalls.github.io/PRovidence/), screen-record 15 seconds. The spider picks letters out of the headline and carries them into the silk jar. Click a letter and it'll go for that one.
2. **The game is your graph.** Record a run of `…/quest/?user=YOUR_NAME`. The boss fight is the money shot: end on **MERGED**.
3. **The terminal.** Run `providence night` in a big font with a dark theme. The ASCII spider wears a hat.
4. **The hook.** Pick one:
   - *"I gave a spider access to my GitHub and woke up to a morning report."*
   - *"It's not allowed to touch anything it hasn't reproduced first."*
   - *"The level is my contribution graph. The enemies are bugs I actually wrote."*
   - *"The last line of the report was a question to itself: What did I not see?"*
5. **Post the link.** Tag the repo so people can raise their own spider.

---

## FAQ

**Will it push to my repo?**
No. There is no push code in PRovidence. The GitHub Action runs with `contents: read`.

**Will it touch my `.env`?**
It reads every text file to hunt for leaked secrets, but it **cannot write** to `.env`, `*.pem`, `*.key`, `id_rsa`, `credentials` or `.npmrc`. That limit is a `throw` in [`src/safety.js`](src/safety.js), not a suggestion.

**It found a leaked token. Why didn't it fix it?**
Because deleting the line doesn't help: the token is already in git history. Revoke it first, then rotate. The finding's `fix_plan` says exactly that.

**Can I write my own hunter?**
Yes: add a function to `hunters` in [`src/hunt.js`](src/hunt.js). If it can be reproduced deterministically, findings are `reproduced`. If not, they're `evidence`. Only set `fixable` if the fix is mechanical and you add a fixer in [`src/fix.js`](src/fix.js).

**Why "PRovidence"?**
An eye that sees everything, inside a triangle. Plus PRs. It was going to happen.

<div align="center">

<br>

<img src="assets/sprites/none.svg" width="140" alt="">

*Reproduce first. Then fix. Then ask what you didn't see.*

**Made by Spike House**

</div>
