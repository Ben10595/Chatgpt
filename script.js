/*
  Reflex Raid
  Ein modernes Reaktionsspiel ohne externe Abhängigkeiten.
*/

const config = {
  rounds: [30, 60, 90],
  sizes: {
    small: 44,
    medium: 64,
    large: 84,
  },
  difficulties: {
    easy: {
      label: "Easy",
      visibleMs: 1200,
      spawnGapMs: 520,
      penaltyMs: 1.5,
      comboCap: 6,
    },
    normal: {
      label: "Normal",
      visibleMs: 950,
      spawnGapMs: 450,
      penaltyMs: 2,
      comboCap: 8,
    },
    hard: {
      label: "Hard",
      visibleMs: 700,
      spawnGapMs: 380,
      penaltyMs: 2.5,
      comboCap: 10,
    },
  },
  score: {
    base: 120,
    bonusMax: 90,
    goldenBonus: 160,
    fakePenalty: 140,
  },
  targetTypes: [
    { type: "normal", weight: 0.75 },
    { type: "golden", weight: 0.15 },
    { type: "fake", weight: 0.1 },
  ],
};

const elements = {
  body: document.body,
  startScreen: document.getElementById("startScreen"),
  gameScreen: document.getElementById("gameScreen"),
  settingsPanel: document.getElementById("settingsPanel"),
  highscorePanel: document.getElementById("highscorePanel"),
  resultScreen: document.getElementById("resultScreen"),
  arena: document.getElementById("arena"),
  countdown: document.getElementById("countdown"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  toast: document.getElementById("toast"),
  scoreText: document.getElementById("scoreText"),
  comboText: document.getElementById("comboText"),
  timeText: document.getElementById("timeText"),
  avgReactionText: document.getElementById("avgReactionText"),
  hitsText: document.getElementById("hitsText"),
  missText: document.getElementById("missText"),
  bestReactionText: document.getElementById("bestReactionText"),
  maxComboText: document.getElementById("maxComboText"),
  resultScore: document.getElementById("resultScore"),
  resultHits: document.getElementById("resultHits"),
  resultMiss: document.getElementById("resultMiss"),
  resultAvg: document.getElementById("resultAvg"),
  resultBest: document.getElementById("resultBest"),
  resultCombo: document.getElementById("resultCombo"),
  highscoreList: document.getElementById("highscoreList"),
  roundSelect: document.getElementById("roundSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  sizeSelect: document.getElementById("sizeSelect"),
  soundSelect: document.getElementById("soundSelect"),
  themeSelect: document.getElementById("themeSelect"),
  debugSelect: document.getElementById("debugSelect"),
  zenSelect: document.getElementById("zenSelect"),
  toggleTheme: document.getElementById("toggleTheme"),
  toggleSound: document.getElementById("toggleSound"),
  startButton: document.getElementById("startButton"),
  openSettings: document.getElementById("openSettings"),
  openHighscores: document.getElementById("openHighscores"),
  saveSettings: document.getElementById("saveSettings"),
  closeSettings: document.getElementById("closeSettings"),
  closeHighscores: document.getElementById("closeHighscores"),
  playAgain: document.getElementById("playAgain"),
  backToMenu: document.getElementById("backToMenu"),
  resumeButton: document.getElementById("resumeButton"),
  restartButton: document.getElementById("restartButton"),
};

const defaultSettings = {
  round: 60,
  difficulty: "normal",
  size: "medium",
  sound: "on",
  theme: "dark",
  debug: "off",
  zen: "off",
};

const state = {
  settings: { ...defaultSettings },
  running: false,
  paused: false,
  countdown: false,
  timerId: null,
  spawnId: null,
  roundRemaining: 60,
  lastSpawnTime: 0,
  activeTarget: null,
  activeTargetTimeout: null,
  score: 0,
  combo: 1,
  maxCombo: 1,
  hits: 0,
  misses: 0,
  reactionTimes: [],
  bestReaction: null,
};

const audioContext = {
  ctx: null,
  enabled: true,
};

const formatMs = (value) => `${Math.round(value)}ms`;

const formatSeconds = (value) => `${value.toFixed(1)}s`;

const average = (list) => {
  if (list.length === 0) {
    return null;
  }
  const sum = list.reduce((acc, item) => acc + item, 0);
  return sum / list.length;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const setScreen = (screen) => {
  const screens = [
    elements.startScreen,
    elements.gameScreen,
    elements.settingsPanel,
    elements.highscorePanel,
    elements.resultScreen,
  ];
  screens.forEach((item) => {
    item.hidden = item !== screen;
  });
};

const showToast = (message) => {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 1600);
};

const initAudio = () => {
  if (!audioContext.ctx) {
    audioContext.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

const playTone = (frequency, duration = 0.12) => {
  if (!audioContext.enabled) {
    return;
  }
  initAudio();
  const oscillator = audioContext.ctx.createOscillator();
  const gain = audioContext.ctx.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.value = 0.15;
  oscillator.connect(gain);
  gain.connect(audioContext.ctx.destination);
  oscillator.start();
  oscillator.stop(audioContext.ctx.currentTime + duration);
};

const updateTheme = () => {
  elements.body.classList.toggle("theme-dark", state.settings.theme === "dark");
  elements.body.classList.toggle("theme-light", state.settings.theme === "light");
  elements.toggleTheme.textContent =
    state.settings.theme === "dark" ? "Dark Mode" : "Light Mode";
};

const updateSoundLabel = () => {
  elements.toggleSound.textContent =
    state.settings.sound === "on" ? "Sound: An" : "Sound: Aus";
};

const resetStats = () => {
  state.score = 0;
  state.combo = 1;
  state.maxCombo = 1;
  state.hits = 0;
  state.misses = 0;
  state.reactionTimes = [];
  state.bestReaction = null;
  updateHud();
};

const updateHud = () => {
  elements.scoreText.textContent = state.score.toString();
  elements.comboText.textContent = `x${state.combo}`;
  elements.hitsText.textContent = state.hits.toString();
  elements.missText.textContent = state.misses.toString();
  elements.maxComboText.textContent = `x${state.maxCombo}`;
  elements.bestReactionText.textContent = state.bestReaction
    ? formatMs(state.bestReaction)
    : "–";
  const avg = average(state.reactionTimes);
  elements.avgReactionText.textContent = avg ? formatMs(avg) : "–";
};

const updateTimerText = () => {
  elements.timeText.textContent = formatSeconds(state.roundRemaining);
};

const applySettings = (settings) => {
  state.settings = { ...settings };
  elements.roundSelect.value = String(settings.round);
  elements.difficultySelect.value = settings.difficulty;
  elements.sizeSelect.value = settings.size;
  elements.soundSelect.value = settings.sound;
  elements.themeSelect.value = settings.theme;
  elements.debugSelect.value = settings.debug;
  elements.zenSelect.value = settings.zen;
  audioContext.enabled = settings.sound === "on";
  updateTheme();
  updateSoundLabel();
  elements.arena.classList.toggle("debug", settings.debug === "on");
};

const readSettingsFromUI = () => ({
  round: Number.parseInt(elements.roundSelect.value, 10),
  difficulty: elements.difficultySelect.value,
  size: elements.sizeSelect.value,
  sound: elements.soundSelect.value,
  theme: elements.themeSelect.value,
  debug: elements.debugSelect.value,
  zen: elements.zenSelect.value,
});

const chooseTargetType = () => {
  const roll = Math.random();
  let sum = 0;
  for (const option of config.targetTypes) {
    sum += option.weight;
    if (roll <= sum) {
      return option.type;
    }
  }
  return "normal";
};

const clearActiveTarget = () => {
  if (state.activeTarget) {
    state.activeTarget.remove();
    state.activeTarget = null;
  }
  if (state.activeTargetTimeout) {
    window.clearTimeout(state.activeTargetTimeout);
    state.activeTargetTimeout = null;
  }
};

const spawnTarget = () => {
  clearActiveTarget();
  const size = config.sizes[state.settings.size];
  const arenaRect = elements.arena.getBoundingClientRect();
  const maxX = arenaRect.width - size - 12;
  const maxY = arenaRect.height - size - 12;
  const x = clamp(Math.random() * maxX, 12, maxX);
  const y = clamp(Math.random() * maxY, 12, maxY);
  const target = document.createElement("button");
  target.className = "target";
  const type = chooseTargetType();
  if (type !== "normal") {
    target.classList.add(type);
  }
  target.dataset.type = type;
  target.style.width = `${size}px`;
  target.style.height = `${size}px`;
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  target.setAttribute("aria-label", "Ziel anklicken");
  target.dataset.spawned = String(Date.now());
  elements.arena.appendChild(target);
  state.activeTarget = target;
  state.lastSpawnTime = Date.now();

  const difficulty = config.difficulties[state.settings.difficulty];
  state.activeTargetTimeout = window.setTimeout(() => {
    registerMiss("Zu spät");
  }, difficulty.visibleMs);
};

const spawnLoop = () => {
  const difficulty = config.difficulties[state.settings.difficulty];
  state.spawnId = window.setInterval(() => {
    if (!state.running || state.paused) {
      return;
    }
    if (!state.activeTarget) {
      spawnTarget();
    }
  }, difficulty.spawnGapMs);
};

const stopSpawnLoop = () => {
  if (state.spawnId) {
    window.clearInterval(state.spawnId);
    state.spawnId = null;
  }
};

const tickTimer = () => {
  state.timerId = window.setInterval(() => {
    if (!state.running || state.paused) {
      return;
    }
    state.roundRemaining = Math.max(state.roundRemaining - 0.1, 0);
    updateTimerText();
    if (state.roundRemaining <= 0) {
      finishRound();
    }
  }, 100);
};

const stopTimer = () => {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
};

const addBurst = (x, y, size) => {
  const burst = document.createElement("div");
  burst.className = "hit-burst";
  burst.style.width = `${size}px`;
  burst.style.height = `${size}px`;
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  elements.arena.appendChild(burst);
  window.setTimeout(() => burst.remove(), 350);
};

const registerHit = (target, reactionMs) => {
  const difficulty = config.difficulties[state.settings.difficulty];
  state.hits += 1;
  state.combo = clamp(state.combo + 1, 1, difficulty.comboCap);
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  if (reactionMs) {
    state.reactionTimes.push(reactionMs);
    state.bestReaction = state.bestReaction
      ? Math.min(state.bestReaction, reactionMs)
      : reactionMs;
  }

  const bonus = reactionMs
    ? clamp(config.score.bonusMax - reactionMs / 10, 20, config.score.bonusMax)
    : 0;
  let scoreDelta = config.score.base + bonus;
  const type = target.dataset.type;
  if (type === "golden") {
    scoreDelta += config.score.goldenBonus;
  }
  if (state.settings.zen === "on") {
    scoreDelta = 0;
  }
  state.score += Math.round(scoreDelta * state.combo * 0.1 + scoreDelta);

  playTone(type === "golden" ? 880 : 620);
  updateHud();
  const avg = average(state.reactionTimes);
  elements.avgReactionText.textContent = avg ? formatMs(avg) : "–";
};

const registerMiss = (reason) => {
  state.misses += 1;
  state.combo = 1;
  updateHud();

  const penalty = config.difficulties[state.settings.difficulty].penaltyMs;
  state.roundRemaining = Math.max(state.roundRemaining - penalty, 0);
  updateTimerText();
  elements.arena.classList.add("screen-shake");
  window.setTimeout(() => {
    elements.arena.classList.remove("screen-shake");
  }, 200);
  playTone(240, 0.15);
  showToast(`${reason}: Combo zurückgesetzt`);
  clearActiveTarget();
};

const handleTargetClick = (event) => {
  const target = event.target.closest(".target");
  if (!target) {
    return;
  }
  if (!state.running || state.paused) {
    return;
  }
  const spawnTime = Number.parseInt(target.dataset.spawned, 10);
  const reactionMs = Date.now() - spawnTime;
  const rect = target.getBoundingClientRect();
  const arenaRect = elements.arena.getBoundingClientRect();
  const burstX = rect.left - arenaRect.left;
  const burstY = rect.top - arenaRect.top;

  if (target.dataset.type === "fake") {
    registerMiss("Fake-Ziel");
    clearActiveTarget();
    return;
  }

  registerHit(target, reactionMs);
  addBurst(burstX, burstY, rect.width);
  clearActiveTarget();
};

const handleArenaClick = (event) => {
  if (!state.running || state.paused) {
    return;
  }
  const clickedTarget = event.target.closest(".target");
  if (clickedTarget) {
    return;
  }
  registerMiss("Vorbeigeklickt");
};

const startCountdown = () => {
  const steps = [3, 2, 1, "GO!"];
  state.countdown = true;
  elements.countdown.setAttribute("aria-hidden", "false");
  let index = 0;

  const showStep = () => {
    if (index >= steps.length) {
      elements.countdown.classList.remove("active");
      elements.countdown.textContent = "";
      elements.countdown.setAttribute("aria-hidden", "true");
      state.countdown = false;
      startRound();
      return;
    }
    elements.countdown.textContent = steps[index];
    elements.countdown.classList.remove("active");
    window.requestAnimationFrame(() => {
      elements.countdown.classList.add("active");
    });
    playTone(440 + index * 120, 0.18);
    index += 1;
    window.setTimeout(showStep, 850);
  };

  showStep();
};

const startRound = () => {
  state.running = true;
  state.paused = false;
  state.roundRemaining = state.settings.round;
  updateTimerText();
  updateHud();
  stopTimer();
  stopSpawnLoop();
  clearActiveTarget();
  tickTimer();
  spawnLoop();
};

const pauseRound = () => {
  if (!state.running) {
    return;
  }
  state.paused = true;
  elements.pauseOverlay.hidden = false;
};

const resumeRound = () => {
  if (!state.running) {
    return;
  }
  state.paused = false;
  elements.pauseOverlay.hidden = true;
};

const finishRound = () => {
  if (!state.running) {
    return;
  }
  state.running = false;
  state.paused = false;
  stopTimer();
  stopSpawnLoop();
  clearActiveTarget();
  elements.pauseOverlay.hidden = true;
  updateResults();
  persistHighscore();
  setScreen(elements.resultScreen);
};

const resetRound = () => {
  state.running = false;
  state.paused = false;
  stopTimer();
  stopSpawnLoop();
  clearActiveTarget();
  resetStats();
  updateTimerText();
};

const updateResults = () => {
  elements.resultScore.textContent = state.score.toString();
  elements.resultHits.textContent = state.hits.toString();
  elements.resultMiss.textContent = state.misses.toString();
  const avg = average(state.reactionTimes);
  elements.resultAvg.textContent = avg ? formatMs(avg) : "–";
  elements.resultBest.textContent = state.bestReaction
    ? formatMs(state.bestReaction)
    : "–";
  elements.resultCombo.textContent = `x${state.maxCombo}`;
};

const persistHighscore = () => {
  if (state.settings.zen === "on") {
    return;
  }
  const record = {
    score: state.score,
    date: new Date().toLocaleDateString("de-DE"),
    round: state.settings.round,
    difficulty: state.settings.difficulty,
    size: state.settings.size,
  };
  const scores = loadHighscores();
  scores.push(record);
  scores.sort((a, b) => b.score - a.score);
  window.localStorage.setItem("reflex-highscores", JSON.stringify(scores.slice(0, 10)));
};

const loadHighscores = () => {
  const stored = window.localStorage.getItem("reflex-highscores");
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
};

const renderHighscores = () => {
  const scores = loadHighscores();
  elements.highscoreList.innerHTML = "";
  if (scores.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Noch keine Highscores gespeichert.";
    elements.highscoreList.appendChild(empty);
    return;
  }
  scores.forEach((score, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${score.score} Punkte · ${score.date} · ${score.round}s · ${score.difficulty}`;
    elements.highscoreList.appendChild(item);
  });
};

const saveSettings = () => {
  const newSettings = readSettingsFromUI();
  applySettings(newSettings);
  resetRound();
  showToast("Einstellungen gespeichert");
  setScreen(elements.startScreen);
};

const toggleTheme = () => {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  elements.themeSelect.value = state.settings.theme;
  updateTheme();
};

const toggleSound = () => {
  state.settings.sound = state.settings.sound === "on" ? "off" : "on";
  elements.soundSelect.value = state.settings.sound;
  audioContext.enabled = state.settings.sound === "on";
  updateSoundLabel();
};

const handleKeyboard = (event) => {
  if (event.key === " ") {
    event.preventDefault();
    if (state.running && !state.paused) {
      pauseRound();
    } else if (state.running && state.paused) {
      resumeRound();
    } else if (!state.countdown && !state.running) {
      beginGameFlow();
    }
  }
  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    beginGameFlow();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    if (state.running && !state.paused) {
      pauseRound();
    }
  }
};

const beginGameFlow = () => {
  resetRound();
  setScreen(elements.gameScreen);
  startCountdown();
};

const handleVisibility = () => {
  if (document.hidden && state.running && !state.paused) {
    pauseRound();
  }
};

const bindEvents = () => {
  elements.startButton.addEventListener("click", beginGameFlow);
  elements.openSettings.addEventListener("click", () => {
    setScreen(elements.settingsPanel);
  });
  elements.openHighscores.addEventListener("click", () => {
    renderHighscores();
    setScreen(elements.highscorePanel);
  });
  elements.saveSettings.addEventListener("click", saveSettings);
  elements.closeSettings.addEventListener("click", () => {
    setScreen(elements.startScreen);
  });
  elements.closeHighscores.addEventListener("click", () => {
    setScreen(elements.startScreen);
  });
  elements.playAgain.addEventListener("click", beginGameFlow);
  elements.backToMenu.addEventListener("click", () => {
    setScreen(elements.startScreen);
  });
  elements.resumeButton.addEventListener("click", resumeRound);
  elements.restartButton.addEventListener("click", beginGameFlow);
  elements.toggleTheme.addEventListener("click", toggleTheme);
  elements.toggleSound.addEventListener("click", toggleSound);
  elements.arena.addEventListener("click", handleArenaClick);
  elements.arena.addEventListener("click", handleTargetClick);
  document.addEventListener("keydown", handleKeyboard);
  document.addEventListener("visibilitychange", handleVisibility);
};

applySettings(defaultSettings);
resetRound();
setScreen(elements.startScreen);
bindEvents();
