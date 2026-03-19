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
// ====== Feedback Visual y Sonoro (PWA) ======

function playBeep() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // Beep agudo corto
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

function flashScreen() {
    const sb = document.querySelector('.scoreboard');
    if (sb) {
        sb.style.transition = 'box-shadow 0.1s ease';
        sb.style.boxShadow = '0 0 50px 15px rgba(56, 189, 248, 0.8), inset 0 0 20px rgba(56, 189, 248, 0.4)';
        setTimeout(() => {
            sb.style.boxShadow = ''; // restored by css class
            setTimeout(() => sb.style.transition = '', 150);
        }, 150);
    }
}

// ====== Input Control Engine ======

// Autobúsqueda Inteligente de Dispositivo
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 1024);
const currentMode = isMobileDevice ? 'SMARTPHONE' : 'DESKTOP';

let btnPressTime = 0;
let btnTapCount = 0;
let btnTapTimeout = null;
let lastKeyTime = 0; // Para el debounce de PC

const genericKeys = ['AudioVolumeUp', 'VolumeUp', '+', 'Enter', ' ', 'MediaPlayPause'];

document.addEventListener('keydown', (e) => {
    // Ignore UI interaction
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.tagName === 'INPUT' || e.target.closest('.init-overlay')) return;
    
    if (currentMode === 'DESKTOP') {
        if (e.key.toLowerCase() === 'z') { undo(); return; }
        
        const now = Date.now();
        if (now - lastKeyTime < 500) return; // 500ms debounce originario
        
        if (e.key === 'ArrowUp') { e.preventDefault(); playBeep(); flashScreen(); scorePoint('A'); lastKeyTime = now; return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); playBeep(); flashScreen(); scorePoint('B'); lastKeyTime = now; return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playBeep(); flashScreen(); askScore(); lastKeyTime = now; return; }
        return;
    }

    // Smartphone Mode: Merge Arrows and volume keys to the single-button multi-tap engine
    if (e.key.toLowerCase() === 'z') { undo(); return; } // Allow standard Z key always
    
    // Capturar botón BT inmediatamente para el feedback visual
    const allTriggers = [...genericKeys, 'ArrowUp', 'ArrowDown'];
    if (allTriggers.includes(e.key)) {
        e.preventDefault();
        if (e.repeat) return; // Prevent hold auto-repeats
        btnPressTime = Date.now();
        playBeep();
        flashScreen();
    }
});

document.addEventListener('keyup', (e) => {
    if (currentMode === 'DESKTOP') return;

    const allTriggers = [...genericKeys, 'ArrowUp', 'ArrowDown'];
    if (allTriggers.includes(e.key)) {
        e.preventDefault();
        if (btnPressTime === 0) return;
        
        const duration = Date.now() - btnPressTime;
        btnPressTime = 0; // Reset
        
        if (duration >= 4000) { // 4+ seg
            askScore();
        } else if (duration >= 1400) { // 1.4s a 4s
            undo();
        } else {
            // Clic corto (Doble tap)
            btnTapCount++;
            clearTimeout(btnTapTimeout);
            btnTapTimeout = setTimeout(() => {
                if (btnTapCount === 1) {
                    scorePoint('A');
                } else if (btnTapCount >= 2) {
                    scorePoint('B');
                }
                btnTapCount = 0;
            }, 350); // 350ms window 
        }
    }
});

function updateInstructions() {
    const instDiv = document.getElementById('instructionsBox');
    if (currentMode === 'DESKTOP') {
        instDiv.innerHTML = `
            <strong>Controles:</strong>
            <span><kbd>↑</kbd> Punto Eq. A</span>
            <span><kbd>↓</kbd> Punto Eq. B</span>
            <span><kbd>Enter/Esp</kbd> Escuchar Marcador</span>
            <span><kbd>Z</kbd> Deshacer</span>
        `;
    } else {
        instDiv.innerHTML = `
            <strong>📱 Control Remoto Bluetooth (1 Botón Múltiple):</strong>
            <span>1 Clic: Pto Eq. A</span>
            <span>2 Clics Rápidos: Pto Eq. B</span>
            <span>Mantener 2s: Deshacer <kbd>Z</kbd></span>
            <span>Mantener 5s: Dictar Voz</span>
        `;
    }
}
updateInstructions();

// ====== iOS Audio Unlock & Apple Watch Media Session ======

let silentAudio = null;

function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Marcador RS Engine',
            artist: 'Partido en Curso',
            album: 'Apple Watch / Audífonos soportados'
        });

        // ⌚ Apple Watch / Smartwatch / Airpods Integration
        navigator.mediaSession.setActionHandler('play', () => { scorePoint('A'); if(silentAudio) silentAudio.play(); });
        navigator.mediaSession.setActionHandler('pause', () => { scorePoint('B'); if(silentAudio) silentAudio.play(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { undo(); if(silentAudio) silentAudio.play(); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { askScore(); if(silentAudio) silentAudio.play(); });
    }
}

// ====== Screen Wake Lock API ======
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.warn('Wake Lock error:', err);
    }
}
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

const initOverlay = document.getElementById('initOverlay');
initOverlay.addEventListener('click', () => {
    requestWakeLock(); // Keep screen on during matches!
    
    // Unlocks global audio Engine
    const unlockUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlockUtterance);
    
    // Apple Watch Mute Media Loop
    try {
        silentAudio = new Audio("data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABpRzE2IFNpbGVudCBBdWRpbyAtIEZyZWUgRG93bmxvYWQAAAAATGF2YzU3LjczLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAJAAAAVwADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwPz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz///////////////////////////////////////////////////wAAADhMYXZjNTcuNzMAAAAAAAAAAAAAAAABAAAALgAAAAAAAFcE3wAAAAAAAAAAAAAAAAAAAAAA//MUZAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAMAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAYAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAgAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAkAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAoAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAsAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZAwAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
        silentAudio.loop = true;
        silentAudio.play().then(() => {
            setupMediaSession();
        }).catch(e => console.warn(e));
    } catch(err) {}
    
    // HACK: Start a silent Web Audio oscillator in the background. 
    // This forces Android Chrome into generic "Media Playback" state, 
    // which sometimes permits physical Volume Up/Down keys to be captured by JS `keydown` events.
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0; // Pure silence
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(0);
        }
    } catch (err) {
        console.warn("AudioContext bypass failed.");
    }
    
    initOverlay.style.opacity = '0';
    setTimeout(() => initOverlay.style.display = 'none', 500);
    speak("Partido iniciado. ¡A jugar!");
});

// Touch controls directos en los recuadros de puntos
document.querySelector('#teamA .points-box').addEventListener('click', () => scorePoint('A'));
document.querySelector('#teamB .points-box').addEventListener('click', () => scorePoint('B'));

// ====== Config Modalities ======
const configChange = () => {
    historyStack = [];
    state = initializeState();
    
    const settings = getGameSettings();
    if (settings.type !== 'normal') {
        state.isTieBreak = true;
    }
    
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
