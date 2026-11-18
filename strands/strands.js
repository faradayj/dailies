// Strands word finder. Word bank: STRANDS_WORDS from words_data.js (4+ letters, most common first).
// The first STRANDS_COMMON words have recorded usage ("likely"); the rest are "long shots".
// The board is 6 columns by 8 rows, stored as 48 letters row by row.

let strandsRank = null;       // word -> index in STRANDS_WORDS (lower = more common)
let strandsPrefixes = null;   // every proper prefix of every word, to cut dead-end paths early
let strandsBoard = "";
let strandsFound = new Map(); // word -> list of paths (each path = list of cell indexes)
let strandsSpangrams = new Map(); // spangram guess ("brass band") -> [path], best guess first
let strandsSelectedWord = null;   // a key of strandsFound or strandsSpangrams
let strandsSelectedCell = null;

// Every bank word traceable on the board through touching cells (8 directions), no cell used twice
function findStrandsWords(board) {
    if (!strandsRank) { // built on first use: takes a moment and other tabs do not need it
        strandsRank = new Map(STRANDS_WORDS.map((w, i) => [w, i]));
        strandsPrefixes = new Set();
        for (const w of STRANDS_WORDS) {
            for (let i = 1; i < w.length; i++) strandsPrefixes.add(w.slice(0, i));
        }
        console.assert(findStrandsWords("word".padEnd(48, "q")).has("word"));
        console.assert(!findStrandsWords("noqqqq".padEnd(48, "q")).has("noon")); // would need to reuse cells
        const fireworkColumn = [..."firework"].map(letter => letter + "qqqqq").join("");
        console.assert(findStrandsSpangrams(findStrandsWords(fireworkColumn)).has("fire work"));
    }
    const found = new Map();
    const visit = (cell, prefix, path) => {
        const str = prefix + board[cell];
        const newPath = [...path, cell];
        if (str.length >= 4 && strandsRank.has(str)) {
            if (!found.has(str)) found.set(str, []);
            found.get(str).push(newPath);
        }
        if (!strandsPrefixes.has(str)) return;
        const row = Math.floor(cell / 6), col = cell % 6;
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                const next = r * 6 + c;
                if (r >= 0 && r < 8 && c >= 0 && c < 6 && !newPath.includes(next)) visit(next, str, newPath);
            }
        }
    };
    for (let cell = 0; cell < 48; cell++) visit(cell, "", []);
    return found;
}

// Spangram guesses: the spangram reaches two opposite edges and is often two words joined ("brass band"),
// which no dictionary lists. So: every likely word, or pair of likely words where the second starts next to
// the end of the first without sharing a cell, whose path reaches opposite edges.
// Returns Map of label -> [path], best guess first (the less common word of a pair decides its place).
function findStrandsSpangrams(found) {
    const reachesOppositeEdges = path =>
        (path.some(c => c % 6 === 0) && path.some(c => c % 6 === 5)) || (path.some(c => c < 6) && path.some(c => c >= 42));
    const touching = (a, b) => Math.abs(Math.floor(a / 6) - Math.floor(b / 6)) <= 1 && Math.abs(a % 6 - b % 6) <= 1;

    const pieces = []; // one per path of each likely word; `mask` has a bit set for every cell used
    for (const [word, paths] of found) {
        if (strandsRank.get(word) >= STRANDS_COMMON) continue;
        for (const path of paths) {
            pieces.push({ word, path, rank: strandsRank.get(word), mask: path.reduce((m, c) => m | (1n << BigInt(c)), 0n) });
        }
    }

    const guesses = [];
    for (const first of pieces) {
        if (reachesOppositeEdges(first.path)) guesses.push({ label: first.word, path: first.path, rank: first.rank });
        const end = first.path[first.path.length - 1];
        for (const second of pieces) {
            if (!touching(end, second.path[0]) || (first.mask & second.mask)) continue;
            const path = first.path.concat(second.path);
            if (reachesOppositeEdges(path)) {
                guesses.push({ label: `${first.word} ${second.word}`, path, rank: Math.max(first.rank, second.rank) });
            }
        }
    }
    guesses.sort((a, b) => a.rank - b.rank);
    const byLabel = new Map();
    for (const g of guesses) if (!byLabel.has(g.label)) byLabel.set(g.label, [g.path]);
    return byLabel;
}

// Re-read the textarea and search again
function updateStrandsBoard() {
    strandsBoard = document.getElementById("strands-input").value.toLowerCase().replace(/[^a-z]/g, "");
    const ready = strandsBoard.length === 48;
    document.getElementById("strands-helper-text").innerText =
        ready ? "" : `Enter all 48 letters (8 rows of 6). ${strandsBoard.length} so far.`;
    strandsFound = ready ? findStrandsWords(strandsBoard) : new Map();
    strandsSpangrams = ready ? findStrandsSpangrams(strandsFound) : new Map();
    strandsSelectedWord = null;
    strandsSelectedCell = null;
    renderStrands();
}
document.getElementById("strands-input").addEventListener("input", updateStrandsBoard);

// Draw the heatmap grid and the word lists for the current search and selection
function renderStrands() {
    const isLikely = w => strandsRank.get(w) < STRANDS_COMMON;
    const cellsOf = new Map(); // word -> every cell any of its paths touches
    const heat = new Array(48).fill(0); // per cell: how many likely words pass through it
    for (const [word, paths] of strandsFound) {
        cellsOf.set(word, new Set(paths.flat()));
        if (isLikely(word)) cellsOf.get(word).forEach(cell => heat[cell]++);
    }
    const maxHeat = Math.max(1, ...heat);
    const tracedPath = strandsSelectedWord
        ? (strandsFound.get(strandsSelectedWord) || strandsSpangrams.get(strandsSelectedWord))[0] : [];

    const grid = document.getElementById("strands-grid");
    grid.innerHTML = "";
    for (let cell = 0; cell < strandsBoard.length && strandsBoard.length === 48; cell++) {
        const step = tracedPath.indexOf(cell);
        const tile = document.createElement("button");
        tile.className = "letter-tile";
        tile.style.backgroundColor = `rgba(56, 189, 248, ${(0.8 * heat[cell] / maxHeat).toFixed(2)})`; // Strands accent
        if (step >= 0) tile.style.border = "3px solid #fff";
        else if (cell === strandsSelectedCell) tile.style.border = "3px dashed #fff";
        tile.setAttribute("aria-label", `${strandsBoard[cell]}, ${heat[cell]} likely words`);
        tile.setAttribute("aria-pressed", cell === strandsSelectedCell);
        // Corner number: step in the traced word, otherwise the heat count
        tile.innerHTML = `${strandsBoard[cell]}<span style="position: absolute; right: 3px; bottom: 1px; font-size: 0.6rem; font-weight: 400;">${step >= 0 ? "#" + (step + 1) : heat[cell]}</span>`;
        tile.onclick = () => {
            strandsSelectedCell = strandsSelectedCell === cell ? null : cell;
            renderStrands();
        };
        grid.appendChild(tile);
    }

    const words = [...strandsFound.keys()]
        .filter(w => strandsSelectedCell === null || cellsOf.get(w).has(strandsSelectedCell))
        .sort((a, b) => b.length - a.length || strandsRank.get(a) - strandsRank.get(b));
    const likely = words.filter(isLikely);
    const longShots = words.filter(w => !isLikely(w));
    const toggleWord = w => {
        strandsSelectedWord = strandsSelectedWord === w ? null : w;
        renderStrands();
    };
    renderWordBadges("strands-likely", likely, toggleWord, strandsSelectedWord);
    renderWordBadges("strands-longshots", longShots, toggleWord, strandsSelectedWord);
    const spangrams = [...strandsSpangrams.keys()]
        .filter(label => strandsSelectedCell === null || strandsSpangrams.get(label)[0].includes(strandsSelectedCell))
        .slice(0, 100); // the list is guesses, best first; past 100 they are noise
    renderWordBadges("strands-spangrams", spangrams, toggleWord, strandsSelectedWord);
    document.getElementById("strands-stat-likely").innerText = likely.length;
    document.getElementById("strands-stat-longshots").innerText = longShots.length;
}
