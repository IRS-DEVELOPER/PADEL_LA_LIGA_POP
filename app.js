const CONFIG = {
    deuceMode: 'advantage', // 'advantage' or 'goldenPoint'
    setsToWin: 2
};

let historyStack = [];
let state = initializeState();

function initializeState() {
    return {
        points: { A: 0, B: 0 },
        games: { A: 0, B: 0 },
        sets: { A: 0, B: 0 },
        isTieBreak: false,
        isSuperTieBreak: false,
        tbPoints: { A: 0, B: 0 },
        matchOver: false,
        winner: null
    };
}

function cloneState(st) {
    return JSON.parse(JSON.stringify(st));
}

function getTeamName(team) {
    const inputId = team === 'A' ? 'nameA' : 'nameB';
    return document.getElementById(inputId).value || `Equipo ${team}`;
}

const POINT_DISPLAY = ["0", "15", "30", "40", "Ad"];
const POINT_SPOKEN = ["Nada", "Quince", "Treinta", "Cuarenta", "Ventaja"];

function render() {
    document.getElementById('setsA').innerText = state.sets.A;
    document.getElementById('setsB').innerText = state.sets.B;
    document.getElementById('gamesA').innerText = state.games.A;
    document.getElementById('gamesB').innerText = state.games.B;
    
    const ptsA = document.getElementById('pointsA');
    const ptsB = document.getElementById('pointsB');
    const status = document.getElementById('matchStatus');

    if (state.matchOver) {
        status.innerText = `¡GANA ${(getTeamName(state.winner)).toUpperCase()}!`;
        ptsA.innerText = '-';
        ptsB.innerText = '-';
        return;
    }

    if (state.isTieBreak) {
        status.innerText = state.isSuperTieBreak ? "SÚPER TIE-BREAK" : "TIE-BREAK";
        ptsA.innerText = state.tbPoints.A;
        ptsB.innerText = state.tbPoints.B;
    } else {
        status.innerText = "";
        ptsA.innerText = POINT_DISPLAY[state.points.A];
        ptsB.innerText = POINT_DISPLAY[state.points.B];
    }

    // Micro-animation trigger
    ptsA.classList.remove('pop-anim');
    ptsB.classList.remove('pop-anim');
    void ptsA.offsetWidth; // trigger reflow
    void ptsB.offsetWidth;
    ptsA.classList.add('pop-anim');
    ptsB.classList.add('pop-anim');
}

function getGameSettings() {
    const val = document.getElementById('gamesToWin').value;
    const thirdSet = document.getElementById('thirdSetRule').value;
    return { 
        type: 'normal', 
        gamesToWinSet: parseInt(val, 10), 
        tbPointsToWin: 7,
        thirdSetSuperTieBreak: (thirdSet === 'STB') 
    };
}

function scorePoint(team) {
    if (state.matchOver) return;

    // Save history
    historyStack.push(cloneState(state));

    const other = team === 'A' ? 'B' : 'A';
    let event = 'POINT';
    const settings = getGameSettings();

    if (state.isTieBreak || state.isSuperTieBreak) {
        state.tbPoints[team]++;
        let targetTbPts = state.isSuperTieBreak ? 10 : settings.tbPointsToWin;

        if (state.tbPoints[team] >= targetTbPts && (state.tbPoints[team] - state.tbPoints[other]) >= 2) {
            if (state.isSuperTieBreak) {
                // Winning a Super Tie Break wins the set immediately
                event = winSet(team);
            } else {
                state.games[team]++; // normal tie break wins the 7th game
                event = winSet(team); 
            }
        }
    } else {
        const pts = state.points[team];
        const opts = state.points[other];

        if (pts === 3) { // currently at 40
            if (opts === 3) { // Deuce
                if (CONFIG.deuceMode === 'goldenPoint') {
                    event = winGame(team);
                } else {
                    state.points[team] = 4; // advantage
                }
            } else if (opts === 4) { // Other had Ad
                state.points[other] = 3; // back to deuce
            } else {
                event = winGame(team);
            }
        } else if (pts === 4) { // currently at Ad
            event = winGame(team);
        } else {
            state.points[team]++;
        }
    }

    render();
    announceEvent(event, team);
}

function winGame(team) {
    const other = team === 'A' ? 'B' : 'A';
    state.games[team]++;
    state.points = { A: 0, B: 0 };
    
    const settings = getGameSettings();
    
    if (state.isTieBreak) {
        // Winning a tiebreak wins the set
        return winSet(team);
    } else {
        if (state.games[team] >= settings.gamesToWinSet) {
            if ((state.games[team] - state.games[other]) >= 2) {
                return winSet(team);
            } else if (state.games[team] === settings.gamesToWinSet && state.games[other] === settings.gamesToWinSet) {
                state.isTieBreak = true;
                state.tbPoints = { A: 0, B: 0 };
                // Actually we return GAME because we won the game and entered tie break
                return 'GAME'; 
            }
        }
    }
    return 'GAME';
}

function winSet(team) {
    state.sets[team]++;
    state.games = { A: 0, B: 0 };
    state.isTieBreak = false;
    state.isSuperTieBreak = false;
    state.tbPoints = { A: 0, B: 0 };

    if (state.sets[team] === CONFIG.setsToWin) {
        state.matchOver = true;
        state.winner = team;
        return 'MATCH';
    }

    const settings = getGameSettings();
    // Check if moving to 3rd Set and STB rule is ON
    if (settings.thirdSetSuperTieBreak && state.sets.A === 1 && state.sets.B === 1) {
        state.isSuperTieBreak = true;
        state.isTieBreak = true; // also true for render styling
    }

    return 'SET';
}

function undo() {
    if (historyStack.length > 0) {
        state = historyStack.pop();
        render();
        speak("Marcador deshecho");
    } else {
        speak("No hay acciones para deshacer");
    }
}

// ------ Speech/Audio Logic ------

let customVoice = null;
function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    customVoice = voices.find(v => v.lang === 'es-DO' || v.lang.includes('DO') || v.name.toLowerCase().includes('dominican'));
    
    // Fallback to Latina / Mexicana
    if (!customVoice) {
        customVoice = voices.find(v => 
            v.lang.includes('es-MX') || 
            v.lang.includes('es-US') || 
            v.lang.includes('es-419') || 
            v.lang.includes('es-AR') || 
            v.name.toLowerCase().includes('mexican') || 
            v.name.toLowerCase().includes('latin')
        );
    }
}

// Load voices once they are available in the browser
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices(); // Try loading immediately too

function speak(text) {
    if(window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (customVoice) {
        utterance.voice = customVoice;
        utterance.lang = customVoice.lang;
    } else {
        utterance.lang = 'es-MX'; // Fallback to ask OS for Mexico/Latin
    }
    
    // Slightly slower rate is sometimes clearer on scoreboards
    utterance.rate = 1.0; 
    window.speechSynthesis.speak(utterance);
}

function getPointText() {
    if (state.isTieBreak) {
        return state.tbPoints.A + " a " + state.tbPoints.B;
    }
    const pA = state.points.A;
    const pB = state.points.B;
    
    if (pA === pB) {
        if (pA === 3) return "Iguales";
        if (pA === 0) return "Cero iguales";
        return POINT_SPOKEN[pA] + " iguales";
    }
    if (pA === 4) return "Ventaja " + getTeamName('A');
    if (pB === 4) return "Ventaja " + getTeamName('B');
    return POINT_SPOKEN[pA] + " a " + POINT_SPOKEN[pB];
}

function announceEvent(event, team) {
    if (event === 'MATCH') {
        speak(`Juego, set y partido para el ${getTeamName(team)}`);
    } else if (event === 'SET') {
        // "Juego para el Equipo A, un set a cero"
        // Prompt example: "Juego para el Equipo A, un set a cero"
        const currentSetsT = state.sets[team];
        const currentSetsO = state.sets[team === 'A' ? 'B' : 'A'];
        speak(`Juego y set para el ${getTeamName(team)}. ${currentSetsT} set a ${currentSetsO}.`);
    } else if (event === 'GAME') {
        const gamesT = state.games[team];
        const gamesO = state.games[team === 'A' ? 'B' : 'A'];
        speak(`Juego para el ${getTeamName(team)}. ${gamesT} a ${gamesO} en juegos.`);
    } else {
        // Just point announcement "Treinta a Quince"
        speak(getPointText());
    }
}

function askScore() {
    if (state.matchOver) {
        speak(`El partido ha terminado. Ganó el ${getTeamName(state.winner)}`);
        return;
    }
    const setsStr = `${state.sets.A} sets a ${state.sets.B}`;
    const gamesStr = `${state.games.A} juegos a ${state.games.B}`;
    const ptsStr = getPointText();
    // Prompt structure Example: "Un set a cero, dos juegos a dos, Treinta iguales"
    speak(`${setsStr}, ${gamesStr}, ${ptsStr}`);
}

// ====== Universal Input Engine (Touch & Bluetooth) ======

let interactionPressTime = 0;
let interactionTapCount = 0;
let interactionTapTimeout = null;

const genericKeys = ['AudioVolumeUp', 'VolumeUp', '+', 'Enter', ' ', 'MediaPlayPause', 'ArrowUp'];

function startInteraction(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.tagName === 'INPUT' || e.target.id === 'initOverlay' || e.target.closest('#initOverlay')) return;
    
    if (e.type === 'keydown') {
        if (e.repeat) { e.preventDefault(); return; }
    }
    
    if (interactionPressTime === 0) {
        interactionPressTime = Date.now();
    }
}

function endInteraction(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.tagName === 'INPUT' || e.target.id === 'initOverlay' || e.target.closest('#initOverlay')) return;
    if (interactionPressTime === 0) return;
    
    const duration = Date.now() - interactionPressTime;
    interactionPressTime = 0; // reset
    
    if (duration >= 5000) {
        askScore();
    } else if (duration >= 2000) {
        undo();
    } else {
        interactionTapCount++;
        clearTimeout(interactionTapTimeout);
        interactionTapTimeout = setTimeout(() => {
            if (interactionTapCount === 1) {
                scorePoint('A');
            } else if (interactionTapCount >= 2) {
                scorePoint('B');
            }
            interactionTapCount = 0;
        }, 400); // 400ms double-tap allowance window
    }
}

// Bind Screen Touch Events for Phones/Tablets
document.addEventListener('touchstart', startInteraction, {passive: true});
document.addEventListener('touchend', endInteraction);

// Bind Bluetooth Remote Events
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'z') { undo(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); scorePoint('B'); return; } // legacy
    
    if (genericKeys.includes(e.key)) {
        e.preventDefault();
        startInteraction(e);
    }
});

document.addEventListener('keyup', (e) => {
    if (genericKeys.includes(e.key)) {
        e.preventDefault();
        endInteraction(e);
    }
});

// ====== iOS Audio Unlock ======

const initOverlay = document.getElementById('initOverlay');
initOverlay.addEventListener('click', () => {
    // Unlocks global audio Engine
    const unlockUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlockUtterance);
    
    initOverlay.style.opacity = '0';
    setTimeout(() => initOverlay.style.display = 'none', 500);
    speak("Partido iniciado. ¡A jugar!");
});

// ====== Config Modalities ======
const configChange = () => {
    historyStack = [];
    state = initializeState();
    render();
    speak("Configuración cambiada. Marcador reiniciado.");
};

document.getElementById('gamesToWin').addEventListener('change', configChange);
document.getElementById('thirdSetRule').addEventListener('change', configChange);

// Start app
const currentSettings = getGameSettings();
if (currentSettings.type !== 'normal') {
    state.isTieBreak = true;
}
render();
