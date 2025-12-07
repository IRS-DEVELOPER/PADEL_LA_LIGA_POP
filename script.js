// State
let allPlayers = []; // { name: string, wins: number }
let tournamentTeams = []; // { p1: string, p2: string, name: string }
let rounds = []; // Array of arrays of matches
let currentMatch = null;
let matchHistory = []; // For undo functionality
let tournamentHistory = []; // Past matches

// Timer State
let matchTimerInterval = null;
let matchTimerSeconds = 0;
let isTimerRunning = false;

// DOM Elements
const newPlayerInput = document.getElementById('new-player-name');
const selectP1 = document.getElementById('select-p1');
const selectP2 = document.getElementById('select-p2');
const individualPlayerList = document.getElementById('individual-player-list');
const teamList = document.getElementById('team-list');
const startBtn = document.getElementById('start-tournament-btn');
const bracketContainer = document.getElementById('bracket-container');
const historyList = document.getElementById('history-list');
const logContainer = document.getElementById('log-container');
const rankingBody = document.getElementById('ranking-body');
const tieBreakIndicator = document.getElementById('tie-break-indicator');
const goldenPointIndicator = document.getElementById('golden-point-indicator');
const matchMetaDisplay = document.getElementById('match-meta-display');

// Inputs for Tournament/Match
const inputClub = document.getElementById('tournament-club');
const inputCourt = document.getElementById('tournament-court');
const inputTime = document.getElementById('tournament-time');
const inputSets = document.getElementById('tournament-sets');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderIndividualPlayers();
    renderTeams();
    updatePlayerSelects();
    renderRanking();
    renderHistory();
    if (rounds.length > 0) {
        renderBracket();
    }
});

// Tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');

        if (btn.dataset.tab === 'ranking') renderRanking();
    });
});

// Player Management
document.getElementById('add-individual-btn').addEventListener('click', addIndividualPlayer);

function addIndividualPlayer() {
    const name = newPlayerInput.value.trim();
    if (name) {
        if (allPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert("El jugador ya existe.");
            return;
        }
        allPlayers.push({ name: name, wins: 0 });
        newPlayerInput.value = '';
        saveData();
        renderIndividualPlayers();
        updatePlayerSelects();
        renderRanking();
    }
}

function removePlayer(index) {
    if (confirm(`¿Eliminar a ${allPlayers[index].name}?`)) {
        allPlayers.splice(index, 1);
        saveData();
        renderIndividualPlayers();
        updatePlayerSelects();
        renderRanking();
    }
}

function renderIndividualPlayers() {
    individualPlayerList.innerHTML = '';
    allPlayers.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `
            <span>${player.name}</span>
            <button class="btn-delete" onclick="removePlayer(${index})"><i class="ph ph-trash"></i></button>
        `;
        individualPlayerList.appendChild(li);
    });
}

function updatePlayerSelects() {
    const renderOptions = (select) => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Seleccionar Jugador</option>';
        allPlayers.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            select.appendChild(option);
        });
        select.value = currentVal;
    };
    renderOptions(selectP1);
    renderOptions(selectP2);
}

// Team Formation
document.getElementById('add-team-btn').addEventListener('click', addTeam);

function addTeam() {
    const p1 = selectP1.value;
    const p2 = selectP2.value;

    if (p1 && p2) {
        if (p1 === p2) {
            alert("Selecciona dos jugadores diferentes.");
            return;
        }
        const teamName = `${p1} / ${p2}`;
        tournamentTeams.push({ p1, p2, name: teamName });
        saveData();
        renderTeams();
        selectP1.value = '';
        selectP2.value = '';
        updateStartButton();
    } else {
        alert("Selecciona ambos jugadores.");
    }
}

function removeTeam(index) {
    tournamentTeams.splice(index, 1);
    saveData();
    renderTeams();
    updateStartButton();
}

function renderTeams() {
    teamList.innerHTML = '';
    tournamentTeams.forEach((team, index) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `
            <span>${team.name}</span>
            <button class="btn-delete" onclick="removeTeam(${index})"><i class="ph ph-x"></i></button>
        `;
        teamList.appendChild(li);
    });
}

function updateStartButton() {
    startBtn.disabled = tournamentTeams.length < 2;
}

startBtn.addEventListener('click', generateTournament);

// Tournament Logic
function generateTournament() {
    if (rounds.length > 0) {
        if (!confirm("Se perderá el torneo actual. ¿Continuar?")) return;
    }

    const club = inputClub.value.trim() || "Club Desconocido";
    const court = inputCourt.value.trim() || "-";
    const time = inputTime.value || "-";
    const totalSets = parseInt(inputSets.value) || 3;

    const shuffled = [...tournamentTeams].sort(() => 0.5 - Math.random());
    const round1 = [];

    for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
            round1.push({
                id: Date.now() + i,
                teamA: shuffled[i],
                teamB: shuffled[i + 1],
                winner: null,
                score: null,
                club: club,
                court: court,
                time: time,
                totalSets: totalSets
            });
        } else {
            round1.push({
                id: Date.now() + i,
                teamA: shuffled[i],
                teamB: { name: "BYE" },
                winner: shuffled[i].name,
                score: "Walkover",
                club: club,
                court: court,
                time: time,
                totalSets: totalSets
            });
        }
    }

    rounds = [round1];
    saveData();
    renderBracket();
    document.querySelector('[data-tab="bracket"]').click();
}

function renderBracket() {
    bracketContainer.innerHTML = '';

    if (rounds.length === 0) {
        bracketContainer.innerHTML = '<p class="placeholder-text">Registra parejas para comenzar el torneo.</p>';
        return;
    }

    rounds.forEach((round, roundIndex) => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'round-container';
        roundDiv.innerHTML = `<h3>Ronda ${roundIndex + 1}</h3>`;

        round.forEach(match => {
            const div = document.createElement('div');
            div.className = 'match-card';

            const isFinished = match.winner !== null;
            const status = isFinished ? `Ganador: ${match.winner}` : 'Pendiente';
            const teamAName = match.teamA ? match.teamA.name : 'TBD';
            const teamBName = match.teamB ? match.teamB.name : 'TBD';

            div.innerHTML = `
                <div class="match-info">
                    <strong>${teamAName} vs ${teamBName}</strong>
                    <small>${status}</small>
                </div>
                ${!isFinished && match.teamA && match.teamB ? `<button class="btn-play" onclick="startMatch(${match.id})">Jugar</button>` : ''}
            `;
            roundDiv.appendChild(div);
        });
        bracketContainer.appendChild(roundDiv);
    });
}

function checkRoundComplete() {
    const currentRoundIndex = rounds.length - 1;
    const currentRound = rounds[currentRoundIndex];
    const allFinished = currentRound.every(m => m.winner !== null);

    if (allFinished) {
        if (currentRound.length === 1) {
            alert(`¡TORNEO FINALIZADO! CAMPEÓN: ${currentRound[0].winner}`);
            return;
        }
        generateNextRound(currentRound);
    }
}

function generateNextRound(prevRound) {
    const nextRound = [];
    const winners = [];

    prevRound.forEach(m => {
        const winnerName = m.winner;
        let winnerTeam = m.teamA.name === winnerName ? m.teamA : m.teamB;
        winners.push(winnerTeam);
    });

    // Inherit metadata from first match of previous round for simplicity, or keep same
    const meta = prevRound[0];

    for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
            nextRound.push({
                id: Date.now() + i,
                teamA: winners[i],
                teamB: winners[i + 1],
                winner: null,
                score: null,
                club: meta.club,
                court: meta.court,
                time: meta.time,
                totalSets: meta.totalSets
            });
        } else {
            nextRound.push({
                id: Date.now() + i,
                teamA: winners[i],
                teamB: { name: "BYE" },
                winner: winners[i].name,
                score: "Walkover",
                club: meta.club,
                court: meta.court,
                time: meta.time,
                totalSets: meta.totalSets
            });
        }
    }

    rounds.push(nextRound);
    saveData();
    renderBracket();
    alert("¡Siguiente ronda generada!");
}

// Scoreboard Logic
function startMatch(matchId) {
    let match = null;
    for (const round of rounds) {
        match = round.find(m => m.id === matchId);
        if (match) break;
    }

    if (!match) return;

    currentMatch = {
        id: matchId,
        teamA: match.teamA,
        teamB: match.teamB,
        pointsA: 0,
        pointsB: 0,
        gamesA: 0,
        gamesB: 0,
        setsA: 0,
        setsB: 0,
        sets: [], // Will be initialized based on totalSets
        currentSet: 0,
        log: [],
        isTieBreak: false,
        deuceCount: 0,
        isGoldenPoint: false,
        isMatchOver: false,
        club: match.club,
        court: match.court,
        time: match.time,
        totalSets: match.totalSets || 3,
        totalSets: match.totalSets || 3,
        cumulativePointsA: 0,  // Total points won by Team A
        cumulativePointsB: 0,   // Total points won by Team B
        isTimerRunning: false,
        timerElapsedTime: 0
    };

    // Reset Timer
    stopTimer();
    matchTimerSeconds = 0;
    updateTimerDisplay();

    // Initialize sets array
    for (let i = 0; i < currentMatch.totalSets; i++) {
        currentMatch.sets.push([0, 0]);
    }

    matchHistory = [];

    document.getElementById('team-a-name').textContent = match.teamA.name;
    document.getElementById('team-b-name').textContent = match.teamB.name;

    // Update Meta Display
    matchMetaDisplay.innerHTML = `
        <span><i class="ph-fill ph-house"></i> ${match.club}</span>
        <span><i class="ph-fill ph-court-basketball"></i> Cancha ${match.court}</span>
        <span><i class="ph-fill ph-clock"></i> ${match.time}</span>
    `;

    // Always start in Live mode
    const liveBoard = document.getElementById('live-scoreboard');
    const manualBoard = document.getElementById('manual-scoreboard');
    const btn = document.getElementById('toggle-mode-btn');

    liveBoard.style.display = 'block';
    manualBoard.style.display = 'none';
    btn.innerHTML = '<i class="ph ph-pencil-simple"></i> Modo Manual';

    // Initialize displays
    updateScoreDisplay();
    renderLog();

    // Switch to scoreboard tab
    document.querySelector('[data-tab="scoreboard"]').click();
}

function renderManualInputs() {
    const container = document.getElementById('manual-sets-container');
    container.innerHTML = '';

    for (let i = 0; i < currentMatch.totalSets; i++) {
        const setDiv = document.createElement('div');
        setDiv.className = 'manual-set-input-group';

        // Pre-fill with current values if available
        const currentValA = currentMatch.sets[i] ? currentMatch.sets[i][0] : 0;
        const currentValB = currentMatch.sets[i] ? currentMatch.sets[i][1] : 0;

        setDiv.innerHTML = `
            <label>SET ${i + 1}</label>
            <div class="manual-inputs-row">
                <input type="number" min="0" max="7" class="manual-input input-set-a-${i}" value="${currentValA}">
                <span class="manual-separator">-</span>
                <input type="number" min="0" max="7" class="manual-input input-set-b-${i}" value="${currentValB}">
            </div>
        `;
        container.appendChild(setDiv);
    }
}

function finishMatchManual() {
    if (!currentMatch) {
        alert("No hay partido activo. Inicia un partido primero.");
        return;
    }

    if (!confirm("¿Finalizar partido con estos resultados manuales?")) return;

    let setsA = 0;
    let setsB = 0;
    const newSets = [];

    for (let i = 0; i < currentMatch.totalSets; i++) {
        const valA = parseInt(document.querySelector(`.input-set-a-${i}`).value) || 0;
        const valB = parseInt(document.querySelector(`.input-set-b-${i}`).value) || 0;

        newSets.push([valA, valB]);

        if (valA > valB) setsA++;
        else if (valB > valA) setsB++;
    }

    // Update match state
    currentMatch.sets = newSets;
    currentMatch.setsA = setsA;
    currentMatch.setsB = setsB;

    // Determine winner based on sets won
    // If it's a draw (e.g. 1-1 in best of 3, which shouldn't happen but user might enter it), 
    // we default to Team A or handle error. For now, simple logic:
    if (setsA > setsB || setsB > setsA) {
        endMatch();
    } else {
        alert("El partido no puede terminar en empate. Revisa los sets.");
    }
}

const POINTS = ['0', '15', '30', '40', 'Ad'];

function addPoint(team) {
    if (currentMatch.isMatchOver) return;
    saveState();

    // Increment cumulative points
    if (team === 'A') currentMatch.cumulativePointsA++;
    else currentMatch.cumulativePointsB++;

    // Auto-start timer on first point
    if (!isTimerRunning && matchTimerSeconds === 0) {
        startTimer();
    }

    const isA = team === 'A';
    const teamName = isA ? currentMatch.teamA.name : currentMatch.teamB.name;

    if (currentMatch.isTieBreak) {
        handleTieBreakPoint(team, teamName);
    } else {
        handleNormalPoint(team, teamName);
    }

    updateScoreDisplay();
}

function handleNormalPoint(team, teamName) {
    const isA = team === 'A';
    let p1 = isA ? currentMatch.pointsA : currentMatch.pointsB;
    let p2 = isA ? currentMatch.pointsB : currentMatch.pointsA;

    // Golden Point Logic Check
    if (currentMatch.isGoldenPoint) {
        // Whoever wins this point wins the game
        winGame(team);
        currentMatch.isGoldenPoint = false;
        currentMatch.deuceCount = 0;
        goldenPointIndicator.style.display = 'none';
        return;
    }

    if (p1 === 3) { // 40
        if (p2 < 3) {
            winGame(team);
        } else if (p2 === 3) { // Deuce
            // Standard Deuce Logic first
            if (isA) currentMatch.pointsA = 4;
            else currentMatch.pointsB = 4;
            logPoint(teamName, "Ventaja");
        } else if (p2 === 4) { // Opponent Ad -> Back to Deuce
            if (isA) currentMatch.pointsB = 3;
            else currentMatch.pointsA = 3;

            // Back to Deuce (40-40)
            currentMatch.deuceCount++;
            logPoint(teamName, `Recupera Deuce (Deuce #${currentMatch.deuceCount})`);

            // Check Golden Point Rule: After 2nd Deuce (not 1st)
            // If we just hit Deuce (40-40) for the 2nd time, the NEXT point is Golden Point
            if (currentMatch.deuceCount >= 2) {
                currentMatch.isGoldenPoint = true;
                goldenPointIndicator.style.display = 'inline-block';
                logPoint("Sistema", "¡PUNTO DE ORO ACTIVO!");
            }
        }
    } else if (p1 === 4) { // Ad -> Win
        winGame(team);
    } else {
        if (isA) currentMatch.pointsA++;
        else currentMatch.pointsB++;

        // Check if we reached 40-40 (Deuce #1) just now
        if (currentMatch.pointsA === 3 && currentMatch.pointsB === 3) {
            currentMatch.deuceCount = 1;
            logPoint("Sistema", "Deuce #1");
        }

        const newScore = `${POINTS[currentMatch.pointsA]} - ${POINTS[currentMatch.pointsB]}`;
        logPoint(teamName, `Punto (${newScore})`);
    }
}

function winGame(team) {
    const teamName = team === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name;

    if (currentMatch.isTieBreak) {
        if (team === 'A') currentMatch.gamesA++;
        else currentMatch.gamesB++;

        logPoint(teamName, "Gana Tie-break y Set");
        finishSet(team);
        return;
    }

    currentMatch.pointsA = 0;
    currentMatch.pointsB = 0;
    currentMatch.deuceCount = 0;
    currentMatch.isGoldenPoint = false;
    goldenPointIndicator.style.display = 'none';

    logPoint(teamName, "Gana Juego");

    if (team === 'A') currentMatch.gamesA++;
    else currentMatch.gamesB++;

    checkSetWin(team);
}

function checkSetWin(team) {
    const gA = currentMatch.gamesA;
    const gB = currentMatch.gamesB;

    // Tie-break at 6-6
    if (gA === 6 && gB === 6) {
        currentMatch.isTieBreak = true;
        tieBreakIndicator.style.display = 'inline-block';
        logPoint("Sistema", "Inicio de Tie-break (6-6)");
        return;
    }

    // Normal set win (6-4, 7-5, 6-0 etc)
    // Must win by 2, or reach 7 (if 7-5)
    if (
        (gA >= 6 && gA >= gB + 2) ||
        (gB >= 6 && gB >= gA + 2) ||
        (gA === 7 && gB === 5) ||
        (gB === 7 && gA === 5)
    ) {
        finishSet(team);
    }
}

function handleTieBreakPoint(team, teamName) {
    const isA = team === 'A';
    if (isA) currentMatch.pointsA++;
    else currentMatch.pointsB++;

    const pA = currentMatch.pointsA;
    const pB = currentMatch.pointsB;

    logPoint(teamName, `Tie-break (${pA}-${pB})`);

    // Win by 7, margin of 2
    if ((pA >= 7 && pA >= pB + 2) || (pB >= 7 && pB >= pA + 2)) {
        // Tie-break winner gets the game (making it 7-6) AND the set
        winGame(team);
    }
}

function finishSet(team) {
    const gA = currentMatch.gamesA;
    const gB = currentMatch.gamesB;
    const teamName = team === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name;

    currentMatch.sets[currentMatch.currentSet] = [gA, gB];
    logPoint(teamName, `Gana Set ${currentMatch.currentSet + 1} (${gA}-${gB})`);

    if (gA > gB) currentMatch.setsA++;
    else currentMatch.setsB++;

    currentMatch.gamesA = 0;
    currentMatch.gamesB = 0;
    currentMatch.pointsA = 0;
    currentMatch.pointsB = 0;
    currentMatch.isTieBreak = false;
    tieBreakIndicator.style.display = 'none';
    currentMatch.currentSet++;

    if (currentMatch.setsA === Math.ceil(currentMatch.totalSets / 2) ||
        currentMatch.setsB === Math.ceil(currentMatch.totalSets / 2)) {
        endMatch();
    }
}

function endMatch() {
    const winnerTeam = currentMatch.setsA > currentMatch.setsB ? currentMatch.teamA : currentMatch.teamB;
    const winnerName = winnerTeam.name;
    const scoreStr = currentMatch.sets.map(s => `${s[0]}-${s[1]}`).join(', ');

    currentMatch.isMatchOver = true;

    // Stop timer
    stopTimer();

    alert(`¡Partido terminado! Ganador: ${winnerName}`);

    // Update individual stats
    const p1 = allPlayers.find(p => p.name === winnerTeam.p1);
    const p2 = allPlayers.find(p => p.name === winnerTeam.p2);
    if (p1) p1.wins++;
    if (p2) p2.wins++;

    // Update tournament data
    let matchFound = false;
    for (const round of rounds) {
        const match = round.find(m => m.id === currentMatch.id);
        if (match) {
            match.winner = winnerName;
            match.score = scoreStr;
            matchFound = true;
            break;
        }
    }

    saveData();
    renderBracket();

    addToHistory(currentMatch.teamA.name, currentMatch.teamB.name, winnerName, scoreStr, currentMatch.club, currentMatch.court, currentMatch.time);
    document.querySelector('[data-tab="bracket"]').click();

    checkRoundComplete();
}

function addToHistory(teamA, teamB, winner, score, club, court, time) {
    tournamentHistory.unshift({
        teamA, teamB, winner, score,
        date: new Date(),
        club: club || "Desconocido",
        court: court || "-",
        time: time || "-"
    });
    saveData();
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (tournamentHistory.length === 0) {
        historyList.innerHTML = '<p class="placeholder-text">No hay partidos finalizados.</p>';
        return;
    }
    tournamentHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-card';
        const dateStr = new Date(item.date).toLocaleDateString();
        div.innerHTML = `
            <div>
                <div class="history-meta">
                    <span><i class="ph-fill ph-calendar-blank"></i> ${dateStr}</span>
                    <span><i class="ph-fill ph-clock"></i> ${item.time}</span>
                    <span><i class="ph-fill ph-house"></i> ${item.club}</span>
                    <span><i class="ph-fill ph-court-basketball"></i> ${item.court}</span>
                </div>
                <div class="history-matchup">${item.teamA} vs ${item.teamB}</div>
            </div>
            <div class="history-result">
                <div class="history-winner">${item.winner}</div>
                <span class="history-score">${item.score}</span>
            </div>
        `;
        historyList.appendChild(div);
    });
}

function exportToExcel() {
    if (tournamentHistory.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const dataToExport = tournamentHistory.map(item => ({
        Fecha: new Date(item.date).toLocaleDateString(),
        Hora: item.time,
        Club: item.club,
        Cancha: item.court,
        Equipo_A: item.teamA,
        Equipo_B: item.teamB,
        Ganador: item.winner,
        Marcador: item.score
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");

    XLSX.writeFile(wb, "Padel_La_Liga_Resultados.xlsx");
}

function renderRanking() {
    rankingBody.innerHTML = '';
    const sortedPlayers = [...allPlayers].sort((a, b) => b.wins - a.wins);

    sortedPlayers.forEach((player, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.wins}</td>
        `;
        rankingBody.appendChild(tr);
    });
}

function updateScoreDisplay() {
    // Update current point score
    if (currentMatch.isTieBreak) {
        document.getElementById('points-a').textContent = currentMatch.pointsA;
        document.getElementById('points-b').textContent = currentMatch.pointsB;
    } else {
        document.getElementById('points-a').textContent = POINTS[currentMatch.pointsA];
        document.getElementById('points-b').textContent = POINTS[currentMatch.pointsB];
    }

    // Update cumulative points display
    const cumulativeA = document.getElementById('cumulative-points-a');
    const cumulativeB = document.getElementById('cumulative-points-b');
    if (cumulativeA) cumulativeA.textContent = currentMatch.cumulativePointsA;
    if (cumulativeB) cumulativeB.textContent = currentMatch.cumulativePointsB;

    // Update current set games
    currentMatch.sets[currentMatch.currentSet] = [currentMatch.gamesA, currentMatch.gamesB];

    // Render set scores
    const setsContainer = document.getElementById('set-scores-container');
    setsContainer.innerHTML = '';

    for (let i = 0; i < currentMatch.totalSets; i++) {
        const setScore = currentMatch.sets[i];
        const setDiv = document.createElement('div');
        setDiv.className = 'set-box';
        setDiv.innerHTML = `
            <span class="label">SET ${i + 1}</span>
            <span class="score">${setScore ? setScore[0] : 0}</span>
            <span class="score">${setScore ? setScore[1] : 0}</span>
        `;
        setsContainer.appendChild(setDiv);
    }
}

function saveState() {
    matchHistory.push(JSON.parse(JSON.stringify(currentMatch)));
}

function undoPoint() {
    if (matchHistory.length > 0) {
        currentMatch = matchHistory.pop();
        updateScoreDisplay();
        renderLog();

        tieBreakIndicator.style.display = currentMatch.isTieBreak ? 'inline-block' : 'none';
        goldenPointIndicator.style.display = currentMatch.isGoldenPoint ? 'inline-block' : 'none';
    }
}

function resetMatch() {
    if (confirm('¿Reiniciar el partido actual?')) {
        startMatch(currentMatch.id);
    }
}

function logPoint(team, action) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    currentMatch.log.unshift({ time, team, action });
    renderLog();
}

function renderLog() {
    logContainer.innerHTML = '';
    currentMatch.log.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span style="color:var(--text-secondary)">[${entry.time}]</span> <strong>${entry.team}</strong>: ${entry.action}`;
        logContainer.appendChild(div);
    });
}

// Timer Functions
function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    matchTimerInterval = setInterval(() => {
        matchTimerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    isTimerRunning = false;
    clearInterval(matchTimerInterval);
}

function resetTimer() {
    stopTimer();
    matchTimerSeconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const hrs = Math.floor(matchTimerSeconds / 3600);
    const mins = Math.floor((matchTimerSeconds % 3600) / 60);
    const secs = matchTimerSeconds % 60;
    document.getElementById('match-timer').textContent =
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleScoreMode() {
    const liveBoard = document.getElementById('live-scoreboard');
    const manualBoard = document.getElementById('manual-scoreboard');
    const btn = document.getElementById('toggle-mode-btn');

    if (liveBoard.style.display !== 'none') {
        // Switch to Manual
        liveBoard.style.display = 'none';
        manualBoard.style.display = 'block';
        btn.innerHTML = '<i class="ph ph-activity"></i> Modo Live';
        renderManualInputs();
    } else {
        // Switch to Live
        liveBoard.style.display = 'block';
        manualBoard.style.display = 'none';
        btn.innerHTML = '<i class="ph ph-pencil-simple"></i> Modo Manual';
    }
}

function saveData() {
    const data = {
        allPlayers,
        tournamentTeams,
        rounds,
        tournamentHistory
    };
    localStorage.setItem('padelData', JSON.stringify(data));
}

function loadData() {
    const data = localStorage.getItem('padelData');
    if (data) {
        const parsed = JSON.parse(data);
        allPlayers = parsed.allPlayers || [];
        tournamentTeams = parsed.tournamentTeams || [];
        rounds = parsed.rounds || [];
        tournamentHistory = parsed.tournamentHistory || [];
    }
}

function resetPlayers() {
    if (confirm("¿Borrar todos los JUGADORES? Esto afectará a las parejas existentes.")) {
        allPlayers = [];
        // Also clear teams as they depend on players
        tournamentTeams = [];
        saveData();
        renderIndividualPlayers();
        updatePlayerSelects();
        renderTeams();
        renderRanking();
        alert("Jugadores y parejas eliminados.");
    }
}

function resetTeams() {
    if (confirm("¿Borrar todas las PAREJAS?")) {
        tournamentTeams = [];
        saveData();
        renderTeams();
        alert("Parejas eliminadas.");
    }
}

function resetTournament() {
    if (confirm("¿Borrar el TORNEO ACTUAL?")) {
        rounds = [];
        currentMatch = null;
        saveData();
        renderBracket();
        document.querySelector('[data-tab="registration"]').click();
        alert("Torneo actual eliminado.");
    }
}

function resetHistory() {
    if (confirm("¿Borrar el HISTORIAL de partidos?")) {
        tournamentHistory = [];
        saveData();
        renderHistory();
        alert("Historial eliminado.");
    }
}

function resetAllData() {
    if (confirm("¿ESTÁS SEGURO? Se borrará ABSOLUTAMENTE TODO y no se podrá recuperar.")) {
        localStorage.removeItem('padelData');
        location.reload();
    }
}

// ========================================
// MOBILE MENU FUNCTIONALITY
// ========================================

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Close mobile menu when clicking a nav button
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Close mobile menu on mobile devices
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});
