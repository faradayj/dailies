// Shared page logic: switching between games, the word-badge list helper, and start-up.
// Each game's own code lives in its folder (wordle/, spelling-bee/, strands/).

// One entry per game. Each needs a "<id>-panel" (sidebar) and "<id>-view" (main area) element in index.html.
const GAMES = {
    wordle: { accent: "var(--wordle-green)", glow: "rgba(106, 170, 100, 0.15)" },
    connections: { accent: "#8b5cf6", glow: "rgba(139, 92, 246, 0.15)" },
    spellingbee: { accent: "#fbbf24", glow: "rgba(251, 191, 36, 0.15)" },
    strands: { accent: "#38bdf8", glow: "rgba(56, 189, 248, 0.15)" }
};

function switchGame(gameId) {
    for (const id of Object.keys(GAMES)) {
        document.getElementById(`${id}-panel`).style.display = id === gameId ? "flex" : "none";
        document.getElementById(`${id}-view`).classList.toggle("active", id === gameId);
    }
    const root = document.documentElement;
    root.style.setProperty("--accent-primary", GAMES[gameId].accent);
    root.style.setProperty("--accent-glow", GAMES[gameId].glow);
}

// Fill a container with one badge per word. With onClick the badges are buttons, and `selected` is highlighted.
function renderWordBadges(containerId, words, onClick, selected) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    for (const word of words) {
        const badge = document.createElement(onClick ? "button" : "div");
        badge.className = "candidate-badge";
        badge.innerText = word;
        if (onClick) {
            badge.setAttribute("aria-pressed", word === selected);
            if (word === selected) badge.style.borderColor = "var(--accent-primary)";
            badge.onclick = () => onClick(word);
        }
        container.appendChild(badge);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    initWordle();
    updateSpellingBeeUI();
    updateStrandsBoard();
});
