// Shared page logic: switching between games, the word-badge list helper, and start-up.
// Each game's own code lives in its folder (wordle/, spelling-bee/, strands/).

// One entry per game. Each needs a "<id>-panel" (sidebar) and "<id>-view" (main area) element in index.html.
// A game with `data` has its word bank loaded the first time it is opened, then `init` runs (the
// solver scripts are loaded up front, so init is looked up at call time).
const GAMES = {
    wordle: { accent: "var(--wordle-green)" },
    spellingbee: { accent: "var(--bee-gold)", data: "spelling-bee/words_data.js", init: () => initSpellingBee() },
    strands: { accent: "var(--strands-blue)", data: "strands/words_data.js", init: () => updateStrandsBoard() }
};

function loadGameData(game) {
    if (!game.data || game.requested) return;
    game.requested = true;
    const script = document.createElement("script");
    script.src = game.data;
    script.onload = game.init;
    script.onerror = () => {
        game.requested = false; // opening the game again retries
        alert(`Could not load ${game.data}.`);
    };
    document.head.appendChild(script);
}

function switchGame(gameId) {
    for (const id of Object.keys(GAMES)) {
        document.getElementById(`${id}-panel`).classList.toggle("active", id === gameId);
        document.getElementById(`${id}-view`).classList.toggle("active", id === gameId);
    }
    document.documentElement.style.setProperty("--accent-primary", GAMES[gameId].accent);
    loadGameData(GAMES[gameId]);
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

// --- Sidebar toggle ---
function syncSidebar() {
    const c = document.body.classList.contains('sidebar-collapsed');
    const b = document.getElementById('sidebar-toggle');
    b.textContent = c ? '>' : '<';
    b.setAttribute('aria-expanded', String(!c));
    b.setAttribute('aria-label', c ? 'show sidebar' : 'hide sidebar');
}
function toggleSidebar() {
    const c = document.body.classList.toggle('sidebar-collapsed');
    try { if (c) localStorage.setItem('sidebar-collapsed', '1'); else localStorage.removeItem('sidebar-collapsed'); } catch (e) {}
    syncSidebar();
}
document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
syncSidebar();
