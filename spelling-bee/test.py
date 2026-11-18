"""Test run: solve every puzzle NYT currently publishes (today, yesterday, past two weeks)
and compare with the official answers. Run: python spelling-bee/test.py """
import json
import os
import re
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "words_data.js")) as f:
    js = f.read()
WORDS = json.loads(re.search(r"SB_WORDS = (\[.*?\]);", js).group(1))
COMMON = int(re.search(r"SB_COMMON = (\d+)", js).group(1))


def solve(center, letters):
    """Same rule as solveSpellingBee in index.html."""
    return [w for w in WORDS if center in w and set(w) <= set(letters)]


req = urllib.request.Request("https://www.nytimes.com/puzzles/spelling-bee", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req).read().decode()
data = json.loads(re.search(r"window\.gameData\s*=\s*(\{.*?\})\s*</script>", html, re.S).group(1))
past = data["pastPuzzles"]
puzzles = {p["printDate"]: p for p in [past["today"], past["yesterday"]] + past["thisWeek"] + past["lastWeek"]}

common_set = set(WORDS[:COMMON])
found = total = 0
for date, p in sorted(puzzles.items()):
    answers = set(p["answers"])
    ours = solve(p["centerLetter"], p["validLetters"])
    hits = answers & set(ours)
    likely = [w for w in ours if w in common_set]
    found += len(hits)
    total += len(answers)
    print(
        f"{date} {p['centerLetter'].upper()}+{''.join(p['outerLetters']).upper()}: "
        f"{len(hits)}/{len(answers)} answers, pangrams {len(set(p['pangrams']) & hits)}/{len(p['pangrams'])}, "
        f"shown {len(likely)} likely + {len(ours) - len(likely)} long shots"
    )
    if answers - hits:
        print("   missed:", " ".join(sorted(answers - hits)))

print(f"\noverall: {found}/{total} answers found ({found / total:.0%}) across {len(puzzles)} puzzles")
assert found / total >= 0.9
