// Wordle solver. Word bank: WORDLE_WORDS from words_data.js, most common word first.

let candidates = [];      // words still consistent with every logged guess
let loggedGuesses = [];   // list of { word, feedback }, feedback like "01200"
const FEEDBACK_CLASSES = ["grey", "yellow", "green"]; // indexed by feedback digit
let currentFeedbackCodes = [0, 0, 0, 0, 0]; // 0=grey, 1=yellow, 2=green for the guess being typed

// --- Solver ---

// Feedback Wordle gives for guess against answer, e.g. "01200"
function getFeedback(guess, answer) {
    // Bit i of `used` = answer letter i already matched. No allocations: this runs millions of times per render.
    let used = 0;
    for (let i = 0; i < 5; i++) {
        if (guess[i] === answer[i]) used |= 1 << i;
    }
    const greens = used;
    let fb = "";
    for (let i = 0; i < 5; i++) {
        let code = 0;
        if (greens & (1 << i)) code = 2;
        else {
            for (let j = 0; j < 5; j++) {
                if (!(used & (1 << j)) && guess[i] === answer[j]) {
                    used |= 1 << j;
                    code = 1;
                    break;
                }
            }
        }
        fb += code;
    }
    return fb;
}
console.assert(getFeedback("speed", "abide") === "00101");
console.assert(getFeedback("eerie", "speed") === "11000");
console.assert(getFeedback("otter", "satin") === "00200");

function filterCandidates(wordsList, guess, feedback) {
    return wordsList.filter(w => getFeedback(guess, w) === feedback);
}

// How plausible each word is as a real answer: about 1 for common words, falling to about 0 for obscure ones.
// Answers are everyday words, so the bank's usage order is the only evidence needed.
const WORDLE_MIDPOINT = 3500; // usage rank where plausibility is 0.5
const WORDLE_PLAUSIBILITY = new Map(
    WORDLE_WORDS.map((w, rank) => [w, 1 / (1 + Math.exp((rank - WORDLE_MIDPOINT) / 500))]));

// Top 5 possible answers. Score = expected information in bits (Shannon entropy over the remaining
// candidates, each counted by its plausibility) + the guess's own plausibility, so a common word
// beats an obscure one that splits the field equally well.
function getGuidingRecommendations() {
    const total = candidates.reduce((sum, w) => sum + WORDLE_PLAUSIBILITY.get(w), 0);
    // shortcut: only the 600 most common candidates are scored as guesses (~0.8s on round 1), raise if that feels fast enough
    return candidates.slice(0, 600).map(guess => {
        const buckets = {};
        for (const w of candidates) {
            const p = getFeedback(guess, w);
            buckets[p] = (buckets[p] || 0) + WORDLE_PLAUSIBILITY.get(w);
        }
        let bits = 0;
        for (const weight of Object.values(buckets)) {
            bits -= (weight / total) * Math.log2(weight / total);
        }
        return { word: guess, score: bits + WORDLE_PLAUSIBILITY.get(guess) };
    }).sort((a, b) => b.score - a.score).slice(0, 5); // stable sort: ties keep the more common word first
}

// --- Guess entry ---

function initWordle() {
    candidates = [...WORDLE_WORDS];
    loggedGuesses = [];
    document.getElementById("stat-total-words").innerText = WORDLE_WORDS.length.toLocaleString();
    document.getElementById("wordle-input").value = "";
    document.getElementById("feedback-input").value = "";
    updatePreviewUI();
    updateWordleUI();
}

// Keeps the guess box, the feedback box and the five preview tiles in sync
function updatePreviewUI() {
    const wordInput = document.getElementById("wordle-input");
    const fbInput = document.getElementById("feedback-input");
    const tiles = document.getElementById("current-guess-preview").querySelectorAll(".letter-tile");

    const word = wordInput.value.toLowerCase().replace(/[^a-z]/g, "").substring(0, 5);
    wordInput.value = word;

    // Feedback always has one digit per typed letter; missing digits default to grey
    const fbVal = fbInput.value.replace(/[^0-2]/g, "").substring(0, word.length).padEnd(word.length, "0");
    fbInput.value = fbVal;
    fbInput.disabled = word.length === 0;

    for (let i = 0; i < 5; i++) {
        currentFeedbackCodes[i] = i < fbVal.length ? parseInt(fbVal[i]) : 0;
        if (i < word.length) {
            tiles[i].innerText = word[i];
            tiles[i].className = "letter-tile " + FEEDBACK_CLASSES[currentFeedbackCodes[i]];
        } else {
            tiles[i].innerText = "•";
            tiles[i].className = "letter-tile empty";
        }
    }
}
document.getElementById("wordle-input").addEventListener("input", updatePreviewUI);
document.getElementById("feedback-input").addEventListener("input", updatePreviewUI);

function cycleTileColor(index) {
    const wordInput = document.getElementById("wordle-input");
    if (index >= wordInput.value.length) {
        wordInput.focus(); // nothing typed in this tile yet
        return;
    }
    currentFeedbackCodes[index] = (currentFeedbackCodes[index] + 1) % 3; // grey -> yellow -> green -> grey
    document.getElementById("feedback-input").value = currentFeedbackCodes.slice(0, wordInput.value.length).join("");
    updatePreviewUI();
}

function submitGuess() {
    const input = document.getElementById("wordle-input");
    const fbInput = document.getElementById("feedback-input");
    const word = input.value.toLowerCase().trim();
    const feedback = fbInput.value.trim();

    if (word.length !== 5) {
        alert("Please enter a valid 5-letter word.");
        return;
    }
    if (feedback.length !== 5) {
        alert("Please enter a 5-digit feedback code (0=grey, 1=yellow, 2=green) in the Feedback box or click the letter tiles above.");
        return;
    }

    loggedGuesses.push({ word, feedback });
    candidates = filterCandidates(candidates, word, feedback);

    input.value = "";
    fbInput.value = "";
    updatePreviewUI();
    updateWordleUI();
}

function deleteGuess(index) {
    loggedGuesses.splice(index, 1);
    candidates = [...WORDLE_WORDS];
    for (const g of loggedGuesses) candidates = filterCandidates(candidates, g.word, g.feedback);
    updateWordleUI();
}

// --- Rendering ---

function updateWordleUI() {
    document.getElementById("stat-cands-left").innerText = candidates.length.toLocaleString();
    document.getElementById("stat-current-round").innerText = loggedGuesses.length + 1;

    // Guess log
    const tbody = document.getElementById("wordle-log-tbody");
    tbody.innerHTML = "";
    loggedGuesses.forEach((g, index) => {
        const miniTiles = [...g.word].map((letter, i) =>
            `<div class="mini-tile ${FEEDBACK_CLASSES[g.feedback[i]]}">${letter}</div>`).join("");
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="color: var(--text-secondary);">#${index + 1}</td>
            <td class="rec-word">${g.word}</td>
            <td><div class="wordle-grid-mini">${miniTiles}</div></td>
            <td style="text-align: right;">
                <button class="action-btn secondary small" onclick="deleteGuess(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Recommended next guesses
    const recContainer = document.getElementById("recommendations-container");
    recContainer.innerHTML = "";
    getGuidingRecommendations().forEach((rec, idx) => {
        const row = document.createElement("div");
        row.className = "rec-row";
        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: var(--text-secondary);">#${idx + 1}</span>
                <span class="rec-word">${rec.word}</span>
            </div>
            <span style="color: var(--accent-primary); font-weight: 700;">${rec.score.toFixed(2)}</span>
        `;
        recContainer.appendChild(row);
    });
    if (candidates.length === 0) {
        recContainer.innerHTML = `
            <div style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.9rem;">
                [!] No suggestions available. Check constraints.
            </div>
        `;
    }

    // Matching candidates
    const shown = candidates.slice(0, 100);
    document.getElementById("candidates-count-label").innerText =
        `Displaying first ${shown.length} of ${candidates.length} matching words.`;
    renderWordBadges("candidates-grid", shown);
    if (candidates.length === 0) {
        document.getElementById("candidates-grid").innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--text-secondary); font-size: 0.85rem;">
                No candidates match the specified guess criteria. Try deleting a guess or resetting the solver.
            </div>
        `;
    }
}
