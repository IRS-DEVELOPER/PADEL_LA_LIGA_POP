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
        status.innerText = "TIE-BREAK";
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
    if (val === 'TB') return { type: 'TB', tbPointsToWin: 7 };
    if (val === 'STB') return { type: 'STB', tbPointsToWin: 10 };
    return { type: 'normal', gamesToWinSet: parseInt(val, 10), tbPointsToWin: 7 };
}

function scorePoint(team) {
    if (state.matchOver) return;

    // Save history
    historyStack.push(cloneState(state));

    const other = team === 'A' ? 'B' : 'A';
    let event = 'POINT';
    const settings = getGameSettings();

    if (state.isTieBreak) {
        state.tbPoints[team]++;
        if (state.tbPoints[team] >= settings.tbPointsToWin && (state.tbPoints[team] - state.tbPoints[other]) >= 2) {
            event = winGame(team); 
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
    state.tbPoints = { A: 0, B: 0 };

    const settings = getGameSettings();
    if (settings.type !== 'normal') {
        state.isTieBreak = true;
    }

    if (state.sets[team] === CONFIG.setsToWin) {
        state.matchOver = true;
        state.winner = team;
        return 'MATCH';
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
    // Try to find a Dominican Republic Spanish voice if the device has one installed
    customVoice = voices.find(v => v.lang === 'es-DO' || v.lang.includes('DO') || v.name.toLowerCase().includes('dominican'));
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
    
    // Force Dominican Republic Locale tag
    utterance.lang = 'es-DO';
    // Bind the specific OS voice if found
    if (customVoice) {
        utterance.voice = customVoice;
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

// ------ Keyboard Input Logic ------

let lastKeyTime = 0;
let volButtonPressTime = 0;
let volButtonTapCount = 0;
let volButtonTapTimeout = null;

document.addEventListener('keydown', (e) => {
    // Volume button logic (State machine start)
    if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
        // Prevent volume UI from showing (depends on OS/Browser combinations)
        e.preventDefault(); 
        if (e.repeat) return; // ignore hold auto-repeats
        volButtonPressTime = Date.now();
        return;
    }

    // Check undo first. Bluetooth controllers might not send Ctrl for Z. So we accept plain 'z' or 'Z'
    if (e.key.toLowerCase() === 'z') {
        undo();
        return;
    }

    const now = Date.now();
    if (now - lastKeyTime < 500) return; // 500ms debounce
    
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        scorePoint('A');
        lastKeyTime = now;
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scorePoint('B');
        lastKeyTime = now;
    } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        askScore();
        lastKeyTime = now;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
        e.preventDefault();
        if (volButtonPressTime === 0) return;
        
        const duration = Date.now() - volButtonPressTime;
        volButtonPressTime = 0;
        
        // Timer Logic
        if (duration >= 5000) {
            // >= 5 seconds -> Ask Score
            askScore();
        } else if (duration >= 2000) {
            // >= 2 seconds -> Undo
            undo();
        } else {
            // Short press (Double tap logic)
            volButtonTapCount++;
            clearTimeout(volButtonTapTimeout);
            volButtonTapTimeout = setTimeout(() => {
                if (volButtonTapCount === 1) {
                    scorePoint('A'); // 1 push
                } else if (volButtonTapCount >= 2) {
                    scorePoint('B'); // 2 pushes
                }
                volButtonTapCount = 0;
            }, 400); // 400ms buffer to detect a second tap
        }
    }
});

// ====== iOS Audio Unlock & Touch Controls ======

const initOverlay = document.getElementById('initOverlay');
initOverlay.addEventListener('click', () => {
    // This empty utterance unlocks the speechSynthesis engine on iOS Safari
    const unlockUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlockUtterance);
    
    // Hide overlay
    initOverlay.style.opacity = '0';
    setTimeout(() => initOverlay.style.display = 'none', 500);
    
    // Announce start
    speak("Partido iniciado. ¡A jugar!");
});

// Touch controls for mobile/tablets
document.querySelector('#teamA .points-box').addEventListener('click', () => scorePoint('A'));
document.querySelector('#teamB .points-box').addEventListener('click', () => scorePoint('B'));

// ====== Config Modalities ======
document.getElementById('gamesToWin').addEventListener('change', () => {
    historyStack = [];
    state = initializeState();
    
    const settings = getGameSettings();
    if (settings.type !== 'normal') {
        state.isTieBreak = true;
    }
    
    render();
    speak("Modalidad de set cambiada. Marcador reiniciado.");
});

// Start app
const currentSettings = getGameSettings();
if (currentSettings.type !== 'normal') {
    state.isTieBreak = true;
}
render();
