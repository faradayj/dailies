"""Regenerate every word bank (the words_data.js file in each game folder).

Sources, downloaded on each run:
  - Wordnik open word list (MIT licence): which words exist.
  - Norvig web unigram counts: how common each word is.
  - NYT Spelling Bee page: official answers currently published, saved into
    spelling-bee/nyt_answers.txt so hand-picked words no list has are still found.

Run: python build_words.py
"""
import json
import os
import re
import urllib.request

WORDS_URL = "https://raw.githubusercontent.com/wordnik/wordlist/main/wordlist-20210729.txt"
COUNTS_URL = "https://norvig.com/ngrams/count_1w.txt"  # "word\tcount", 333k web words
NYT_URL = "https://www.nytimes.com/puzzles/spelling-bee"
HERE = os.path.dirname(os.path.abspath(__file__))
ANSWERS_PATH = os.path.join(HERE, "spelling-bee", "nyt_answers.txt")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req).read().decode()


def write_bank(folder, name, words, common_count=None):
    """Write <folder>/words_data.js defining <name>_WORDS and, if given, <name>_COMMON."""
    with open(os.path.join(HERE, folder, "words_data.js"), "w") as f:
        f.write(f"const {name}_WORDS = {json.dumps(words, separators=(',', ':'))};\n")
        if common_count is not None:
            f.write(f"const {name}_COMMON = {common_count}; // words before this index are the common ones\n")
    print(f"{folder}: {len(words)} words" + (f", {common_count} common" if common_count is not None else ""))


def fetch_nyt_puzzles():
    """Every Spelling Bee puzzle NYT publishes right now (today, yesterday, past two weeks), as NYT's own dicts."""
    data = json.loads(re.search(r"window\.gameData\s*=\s*(\{.*?\})\s*</script>", fetch(NYT_URL), re.S).group(1))
    past = data["pastPuzzles"]
    return [past["today"], past["yesterday"]] + past["thisWeek"] + past["lastWeek"]


def load_nyt_answers(dictionary):
    """Saved Spelling Bee answers, plus whatever NYT publishes right now. The file only ever grows."""
    saved = set()
    if os.path.exists(ANSWERS_PATH):
        with open(ANSWERS_PATH) as f:
            saved = set(f.read().split())
    try:
        current = {w for p in fetch_nyt_puzzles() for w in p["answers"]}
        print(f"NYT answers published now: {len(current)}, missing from the word list: {' '.join(sorted(current - dictionary)) or 'none'}")
        print(f"new answers saved: {len(current - saved)}")
        saved |= current
        with open(ANSWERS_PATH, "w") as f:
            f.write("\n".join(sorted(saved)) + "\n")
    except Exception as e:  # NYT page changed or offline: keep building from what is already saved
        print(f"WARNING: could not read NYT answers ({e}); using the {len(saved)} already saved")
    return saved


def main():
    # Wordnik lines look like "word" (with the quotes)
    dictionary = {line.strip().strip('"').lower() for line in fetch(WORDS_URL).splitlines()}
    dictionary = {w for w in dictionary if w.isalpha()}
    counts = {w: int(n) for w, n in (line.split() for line in fetch(COUNTS_URL).splitlines())}
    by_usage = lambda w: (-counts.get(w, 0), w)

    # Wordle: 5-letter words with recorded usage. Answers are always common words, so the rest is noise.
    wordle = sorted((w for w in dictionary if len(w) == 5 and w in counts), key=by_usage)
    assert all(w in wordle for w in ("about", "crane", "slate")), "common words lost"
    write_bank("wordle", "WORDLE", wordle)

    # Spelling Bee: 4+ letters, at most 7 different letters. Nothing is dropped for being rare,
    # because real answers like "atilt" have no recorded usage; rare words are listed after the common ones.
    # shortcut: words with "s" are dropped because NYT has never put S in a hive, remove the filter if that changes
    nyt_answers = load_nyt_answers(dictionary)
    bee = [w for w in dictionary | nyt_answers if w.isalpha() and len(w) >= 4 and len(set(w)) <= 7 and "s" not in w]
    bee_common = sorted((w for w in bee if w in counts or w in nyt_answers), key=by_usage)  # a past NYT answer counts as common
    bee_rare = sorted(w for w in bee if w not in counts and w not in nyt_answers)
    assert "hippo" in bee_common and "lollipop" in bee_common and bee_rare
    write_bank("spelling-bee", "SB", bee_common + bee_rare, len(bee_common))

    # Strands: every word of 4+ letters, common ones first.
    strands = [w for w in dictionary if len(w) >= 4]
    strands_common = sorted((w for w in strands if w in counts), key=by_usage)
    strands_rare = sorted(w for w in strands if w not in counts)
    assert "that" in strands_common and "trombone" in strands_common and strands_rare
    write_bank("strands", "STRANDS", strands_common + strands_rare, len(strands_common))


if __name__ == "__main__":
    main()
