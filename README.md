# dailies

Helpers for daily word games, in one static page. No server and no build step: open `index.html` in a browser.

| Game | What it does |
|---|---|
| Wordle | Enter guesses and colours; lists the remaining possible answers and the five most informative next guesses. |
| Spelling Bee | Enter the 7 letters; lists every matching word, pangrams first, common words before long shots. |
| Strands | Paste the 6x8 grid; finds every hidden word and shades each cell by how many words pass through it. |
| Connections | Placeholder. |

## Layout

- `index.html`, `styles.css`, `app.js`: the page, its styling, and game switching.
- `wordle/`, `spelling-bee/`, `strands/`: each game's code plus its generated word bank (`words_data.js`).
- `build_words.py`: regenerates all word banks.
- `spelling-bee/test.py`: checks the Spelling Bee helper against the puzzles NYT currently publishes.

## Rebuilding the word banks

```
python build_words.py
python spelling-bee/test.py
```

Needs only Python 3 and an internet connection. Words come from the [Wordnik word list](https://github.com/wordnik/wordlist) (MIT), ranked by Peter Norvig's [web word counts](https://norvig.com/ngrams/). Each build also saves the Spelling Bee answers NYT currently publishes into `spelling-bee/nyt_answers.txt`.
