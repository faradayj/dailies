import sys
import ast
import os


def load_words(path=None):
    """
    Load and return a list of 5-letter lowercase words from a file that
    contains a Python list literal like ["word", "other", ...].
    """
    if path is None:
        # Make path relative to the script's location
        base_dir = os.path.dirname(__file__)
        path = os.path.join(base_dir, "words.txt")

    try:
        with open(path, "r") as f:
            content = f.read()
        words = ast.literal_eval(content)
        # ensure lowercase 5-letter words
        words = [w.lower() for w in words if isinstance(w, str) and len(w) == 5]
        return words
    except FileNotFoundError:
        print(f"Error: '{path}' not found.")
        sys.exit(1)
    except (SyntaxError, ValueError):
        print(f"Error: '{path}' does not contain a valid Python list literal.")
        sys.exit(1)


def filter_words(candidates, guess, feedback):
    """
    candidates: list of possible words
    guess: string of length 5, e.g. "raise"
    feedback: string of five digits (0,1,2), e.g. "00211"
      0 = grey, 1 = yellow, 2 = green
    """
    new_cands = []
    for w in candidates:
        ok = True
        for i, (g, fb) in enumerate(zip(guess, feedback)):
            if fb == "2":  # green
                if w[i] != g:
                    ok = False
                    break
            elif fb == "1":  # yellow
                if w[i] == g or g not in w:
                    ok = False
                    break
            elif fb == "0":  # grey
                # account for duplicates in guess: only allow non-grey counts
                non_grey = sum(
                    1
                    for (gc, fbc) in zip(guess, feedback)
                    if gc == g and fbc in ("1", "2")
                )
                if w.count(g) != non_grey:
                    ok = False
                    break
            else:
                print("Invalid feedback; use only digits 0,1,2.")
                sys.exit(1)
        if ok:
            new_cands.append(w)
    return new_cands


def main():
    candidates = load_words()
    round_num = 1

    print("Wordle Solver")
    print("-------------")
    print("Enter your guess and feedback (0=grey,1=yellow,2=green).")
    print("Example: guess: raise   feedback: 00211\n")

    while True:
        guess = input(f"[Round {round_num}] Guess: ").strip().lower()
        if len(guess) != 5 or not guess.isalpha():
            print("Please enter a 5‑letter word.")
            continue
        fb = input(f"[Round {round_num}] Feedback: ").strip()
        if len(fb) != 5 or any(c not in "012" for c in fb):
            print("Feedback must be 5 digits, each 0, 1, or 2.")
            continue

        candidates = filter_words(candidates, guess, fb)
        print(f"\nCandidates remaining: {len(candidates)}")
        for w in candidates[:10]:
            print(" ", w)
        if len(candidates) == 0:
            print("⚠️ No words match—check your inputs.")
            break
        if fb == "22222":
            print("\nSolved!")
            break

        round_num += 1
        print()


if __name__ == "__main__":
    main()
