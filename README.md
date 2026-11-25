# Daily Game Solver

Helpers for Wordle, Spelling Bee and Strands.

Live: https://faradayj.github.io/dailies/

## Run

Open `index.html` in a browser. To rebuild the word lists:

    python build_words.py

Words come from the [Wordnik word list](https://github.com/wordnik/wordlist) (MIT), ranked by [Peter Norvig's word counts](https://norvig.com/ngrams/).

## Test

    python spelling-bee/test.py

## Files

- `index.html`, `styles.css`, `app.js`: the page
- `wordle/`, `spelling-bee/`, `strands/`: each game's code and word list
- `build_words.py`: rebuilds the word lists
- `spelling-bee/nyt_answers.txt`: past NYT answers, saved on each build. Keep it, it can't be rebuilt.
- `pokedoku/`: not finished, not on the page yet
