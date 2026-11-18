// Spelling Bee helper. Word bank: SB_WORDS from words_data.js (4+ letters, most common first).
// The first SB_COMMON words have recorded usage or are past NYT answers.

const SB_COMMON_WORDS = new Set(SB_WORDS.slice(0, SB_COMMON));

// Words using only `letters` and containing `center`, most common first
function solveSpellingBee(center, letters) {
    return SB_WORDS.filter(w => w.includes(center) && [...w].every(c => letters.includes(c)));
}
console.assert(solveSpellingBee("o", "ohilnpy").includes("lollipop"));
console.assert(!solveSpellingBee("o", "ohilnpy").some(w => !w.includes("o") || /[^ohilnpy]/.test(w)));

function updateSpellingBeeUI() {
    const centerInput = document.getElementById("sb-center");
    const outerInput = document.getElementById("sb-outer");
    centerInput.value = centerInput.value.toLowerCase().replace(/[^a-z]/g, "");
    outerInput.value = outerInput.value.toLowerCase().replace(/[^a-z]/g, "");
    const letters = centerInput.value + outerInput.value;

    let problem = "";
    if (letters.length < 7) problem = "Enter the center letter and the 6 outer letters.";
    else if (new Set(letters).size < 7) problem = "All 7 letters must be different.";
    else if (letters.includes("s")) problem = "NYT never uses S, so the word bank has no S words.";
    document.getElementById("sb-helper-text").innerText = problem;

    const words = problem ? [] : solveSpellingBee(centerInput.value, letters);
    const isPangram = w => new Set(w).size === 7;
    const pangrams = words.filter(isPangram);
    renderWordBadges("sb-pangrams", pangrams);
    renderWordBadges("sb-likely", words.filter(w => !isPangram(w) && SB_COMMON_WORDS.has(w)));
    renderWordBadges("sb-longshots", words.filter(w => !isPangram(w) && !SB_COMMON_WORDS.has(w)));

    document.getElementById("sb-stat-words").innerText = words.length;
    document.getElementById("sb-stat-pangrams").innerText = pangrams.length;
}
document.getElementById("sb-center").addEventListener("input", updateSpellingBeeUI);
document.getElementById("sb-outer").addEventListener("input", updateSpellingBeeUI);
