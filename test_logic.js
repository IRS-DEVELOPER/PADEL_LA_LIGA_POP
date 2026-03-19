const fs = require('fs');

// Mock browser environment
global.document = {
    getElementById: () => ({ value: '', innerText: '', classList: { remove: ()=>{}, add: ()=>{} }, offsetWidth: 0 }),
    addEventListener: () => {}
};
global.window = {
    speechSynthesis: { speaking: false, cancel: ()=>{}, speak: ()=>{} }
};
global.SpeechSynthesisUtterance = function() {};

// Read and execute app.js
const code = fs.readFileSync('C:/Users/ingsi/.gemini/antigravity/scratch/padel-marcador/app.js', 'utf8');
eval(code);

// Run tests
console.log("--- Starting Tests ---");
let passed = 0;
let total = 0;

function assertEqual(actual, expected, msg) {
    total++;
    if (actual === expected) {
        passed++;
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg} - Expected ${expected}, got ${actual}`);
    }
}

// Ensure state is empty
assertEqual(state.points.A, 0, "Initial Points A is 0");

// Test A scores 3 points -> 40
scorePoint('A');
scorePoint('A');
scorePoint('A');
assertEqual(state.points.A, 3, "Points A is 3 (40)");

// Test B scores 3 points -> 40
scorePoint('B');
scorePoint('B');
scorePoint('B');
assertEqual(state.points.B, 3, "Points B is 3 (40)");

// Both are 40 (Deuce). A scores -> Ad
scorePoint('A');
assertEqual(state.points.A, 4, "A gets Advantage (4)");

// B scores -> Deuce again (Back to 3)
scorePoint('B');
assertEqual(state.points.A, 3, "A loses Advantage (back to 3)");
assertEqual(state.points.B, 3, "B stays at 3 (Deuce)");

// A scores twice -> Wins game
scorePoint('A'); // Ad
scorePoint('A'); // Win
assertEqual(state.games.A, 1, "A wins Game 1");
assertEqual(state.points.A, 0, "Points A reset");

// Test winning Set A
// A needs to win 5 more games (6 total)
for (let i = 0; i < 5; i++) {
    scorePoint('A'); scorePoint('A'); scorePoint('A'); scorePoint('A'); 
}
assertEqual(state.sets.A, 1, "A wins Set 1");
assertEqual(state.games.A, 0, "Games A reset");

console.log(`--- Test Results: ${passed}/${total} PASS ---`);
