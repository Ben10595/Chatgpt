const state = {
  secret: 0,
  attempts: 0,
  best: null,
  history: [],
  isSolved: false,
};

const statusText = document.getElementById("statusText");
const hintText = document.getElementById("hintText");
const attemptsText = document.getElementById("attemptsText");
const bestText = document.getElementById("bestText");
const historyList = document.getElementById("historyList");
const guessInput = document.getElementById("guessInput");
const guessButton = document.getElementById("guessButton");
const resetButton = document.getElementById("resetButton");

const hints = [
  "Die Zahl ist gerade.",
  "Die Zahl ist ungerade.",
  "Sie liegt näher an 20 als an 1.",
  "Sie liegt näher an 1 als an 20.",
  "Sie ist kleiner als 10.",
  "Sie ist größer als 10.",
];

const newGame = () => {
  state.secret = Math.floor(Math.random() * 20) + 1;
  state.attempts = 0;
  state.history = [];
  state.isSolved = false;
  statusText.textContent = "Ich denke an eine Zahl …";
  hintText.textContent = hints[Math.floor(Math.random() * hints.length)];
  attemptsText.textContent = "0";
  guessInput.value = "";
  guessInput.focus();
  renderHistory();
  updateBest();
  guessButton.disabled = false;
};

const updateBest = () => {
  if (state.best !== null) {
    bestText.textContent = String(state.best);
  } else {
    bestText.textContent = "–";
  }
};

const renderHistory = () => {
  historyList.innerHTML = "";
  if (state.history.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Noch keine Tipps abgegeben.";
    historyList.appendChild(empty);
    return;
  }

  state.history.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.message;
    if (entry.success) {
      item.classList.add("success");
    }
    historyList.appendChild(item);
  });
};

const handleGuess = () => {
  const guess = Number.parseInt(guessInput.value, 10);
  if (Number.isNaN(guess)) {
    statusText.textContent = "Bitte gib eine Zahl ein.";
    return;
  }
  if (guess < 1 || guess > 20) {
    statusText.textContent = "Nur Zahlen zwischen 1 und 20 sind erlaubt.";
    return;
  }
  if (state.isSolved) {
    statusText.textContent = "Das Spiel ist vorbei. Starte ein neues Spiel.";
    return;
  }

  state.attempts += 1;
  attemptsText.textContent = String(state.attempts);

  if (guess === state.secret) {
    state.isSolved = true;
    statusText.textContent = `Treffer! ${guess} ist richtig.`;
    hintText.textContent = "Du hast die Zahlenjagd gewonnen.";
    state.history.unshift({
      message: `Richtig geraten mit ${guess} in ${state.attempts} Versuchen!`,
      success: true,
    });
    if (state.best === null || state.attempts < state.best) {
      state.best = state.attempts;
      updateBest();
    }
    guessButton.disabled = true;
    renderHistory();
    return;
  }

  const direction = guess < state.secret ? "zu klein" : "zu groß";
  statusText.textContent = `${guess} ist ${direction}.`;
  state.history.unshift({
    message: `Tipp ${state.attempts}: ${guess} (${direction})`,
    success: false,
  });
  renderHistory();
};

const handleEnter = (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
};

guessButton.addEventListener("click", handleGuess);
resetButton.addEventListener("click", newGame);
guessInput.addEventListener("keydown", handleEnter);

newGame();
