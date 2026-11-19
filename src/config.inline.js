window.CONFIG = {
  meta: { title: "Sky Marble Rush", slug: "sky-marble-rush", version: "v01", mode: "APP", appVersion: "1.0.0", seed: 41873, privacyUrl: { en: "https://www.theordino.com/sky-marble-rush/privacy", tr: "https://www.theordino.com/sky-marble-rush/gizlilik" } },
  // AdMob. testMode:true => Google test ads everywhere. Paste real unit IDs and set testMode:false ONLY for the store build.
  ads: {
    testMode: true, // !!! MAĞAZA BUILD'İNDEN ÖNCE false YAP !!!
    android: { appId: "ca-app-pub-5759922022739187~9340485074", interstitial: "ca-app-pub-5759922022739187/9148913381", rewarded: "ca-app-pub-5759922022739187/3815202365" },
    ios: { appId: "ca-app-pub-5759922022739187~6282629788", interstitial: "ca-app-pub-5759922022739187/7428190498", rewarded: "ca-app-pub-5759922022739187/2343384778" },
    interstitialFromLevel: 3, interstitialEveryRounds: 3, interstitialMinGapSec: 90
  },
  layout: { design: "390x844", min: "320x480", critical: "390x600" },
  levels: [
    { id: "islands", name: "lvl.islands" },
    { id: "cliffs", name: "lvl.cliffs" },
    { id: "canyon", name: "lvl.canyon" },
    { id: "space", name: "lvl.space" }
  ],
  params: {
    maxSpeed:     { label: "Top rolling speed", group: "Player", type: "float", def: 15, min: 9, max: 24, step: 0.5, apply: "live", diff: "easier-high", marketer: true, unit: "u/s" },
    accel:        { label: "Acceleration", group: "Player", type: "float", def: 14, min: 6, max: 26, step: 0.5, apply: "live", diff: "easier-high", marketer: true },
    brakeDecel:   { label: "Brake strength", group: "Player", type: "float", def: 22, min: 8, max: 40, step: 1, apply: "live", diff: "easier-high", marketer: true },
    steerSpeed:   { label: "Steering speed", group: "Player", type: "float", def: 7.5, min: 4, max: 12, step: 0.1, apply: "live", diff: "easier-high", marketer: true },
    levelTime:    { label: "Seconds per level", group: "Difficulty", type: "int", def: 32, min: 20, max: 90, step: 1, apply: "restart", diff: "easier-high", marketer: true, unit: "s" },
    lives:        { label: "Lives", group: "Difficulty", type: "int", def: 3, min: 1, max: 5, step: 1, apply: "restart", diff: "easier-high", marketer: true },
    trackWidth:   { label: "Track width", group: "Difficulty", type: "float", def: 3.4, min: 2.4, max: 5, step: 0.1, apply: "restart", diff: "easier-high" },
    hammerPeriod: { label: "Hammer swing time", group: "Enemies", type: "float", def: 2.8, min: 1.6, max: 4.5, step: 0.1, apply: "live", diff: "easier-high", marketer: true, unit: "s" },
    sweeperRpm:   { label: "Sweeper speed", group: "Enemies", type: "float", def: 16, min: 8, max: 40, step: 1, apply: "live", diff: "easier-low", marketer: true, unit: "rpm" },
    smashSpeed:   { label: "Speed to smash walls", group: "Difficulty", type: "float", def: 10, min: 5, max: 15, step: 0.5, apply: "live", diff: "easier-low" },
    jumpMinSpeed: { label: "Speed to clear gaps", group: "Difficulty", type: "float", def: 8, min: 4, max: 12, step: 0.5, apply: "live", diff: "easier-low" },
    gapLen:       { label: "Gap length", group: "Difficulty", type: "float", def: 5, min: 3, max: 9, step: 0.5, apply: "restart", diff: "easier-low" },
    boostSpeed:   { label: "Boost speed", group: "Player", type: "float", def: 22, min: 15, max: 30, step: 0.5, apply: "live", diff: "easier-high" },
    boostTime:    { label: "Boost time", group: "Player", type: "float", def: 2.2, min: 1, max: 5, step: 0.1, apply: "live", diff: "easier-high", unit: "s" },
    magnetTime:   { label: "Magnet time", group: "Player", type: "float", def: 7, min: 2, max: 15, step: 0.5, apply: "live", diff: "easier-high", unit: "s" },
    doubleTime:   { label: "x2 coins time", group: "Economy", type: "float", def: 8, min: 3, max: 15, step: 0.5, apply: "live", unit: "s" },
    giantTime:    { label: "Giant ball time", group: "Player", type: "float", def: 5, min: 2, max: 10, step: 0.5, apply: "live", diff: "easier-high", unit: "s" },
    extraTime:    { label: "Extra time bonus", group: "Player", type: "int", def: 8, min: 3, max: 20, step: 1, apply: "live", diff: "easier-high", unit: "s" },
    bandLen:      { label: "Multiplier band length", group: "Economy", type: "float", def: 4.2, min: 2.5, max: 7, step: 0.1, apply: "restart", diff: "easier-high" },
    stageScale:   { label: "Level step", group: "Difficulty", type: "float", def: 1.12, min: 1, max: 1.4, step: 0.01, apply: "restart", diff: "easier-low" },
    hintDelay:    { label: "Hint delay", group: "Timing", type: "float", def: 2.2, min: 1, max: 8, step: 0.1, apply: "live", shared: true, unit: "s" },
    language:     { label: "Language", group: "Language", type: "enum", def: "auto", options: ["auto", "tr", "en"], apply: "live", shared: true },
    difficulty:   { label: "Difficulty", group: "Difficulty", type: "enum", def: "normal", options: ["easy", "normal", "hard"], apply: "restart", shared: true },
    sfxVolume:    { label: "Sound effects volume", group: "Sound", type: "float", def: 0.3, min: 0, max: 1, step: 0.01, apply: "live", marketer: true, pct: true },
    musicVolume:  { label: "Music volume", group: "Sound", type: "float", def: 0.2, min: 0, max: 1, step: 0.01, apply: "live", marketer: true, pct: true },
    cameraDistance: { label: "Camera distance", group: "Camera", type: "float", def: 6.4, min: 3.5, max: 9, step: 0.1, apply: "live", marketer: true },
    cameraHeight: { label: "Camera height", group: "Camera", type: "float", def: 2.9, min: 1.4, max: 5, step: 0.1, apply: "live", marketer: true },
    cameraFov:    { label: "Lens width", group: "Camera", type: "float", def: 58, min: 45, max: 75, step: 1, apply: "live", marketer: true, unit: "deg" },
    cameraLead:   { label: "Look-ahead", group: "Camera", type: "float", def: 9, min: 4, max: 16, step: 0.5, apply: "live", marketer: true },
    cameraShake:  { label: "Shake strength", group: "Camera", type: "float", def: 1, min: 0, max: 2, step: 0.05, apply: "live", marketer: true },
    cameraFollow: { label: "Follow speed", group: "Camera", type: "float", def: 6, min: 2, max: 14, step: 0.5, apply: "live", marketer: true },
    playerColor:  { label: "Marble colour", group: "Colors", type: "color", def: "#3FA9F5", options: ["#3FA9F5", "#FF4FA3", "#35D07F", "#FFC93C", "#9B6CFF"], apply: "live", marketer: true },
    playerColor2: { label: "Marble swirl colour", group: "Colors", type: "color", def: "#FF4FA3", options: ["#FF4FA3", "#FFFFFF", "#FFC93C", "#3FA9F5"], apply: "live", marketer: true },
    railColor:    { label: "Rail stripe colour", group: "Colors", type: "color", def: "#FF3B5C", options: ["#FF3B5C", "#3FA9F5", "#35D07F", "#FFC93C"], apply: "live", marketer: true },
    hazardColor:  { label: "Hammer colour", group: "Colors", type: "color", def: "#E5352B", options: ["#E5352B", "#9B6CFF", "#FF8A1A", "#2B6BE5"], apply: "live", marketer: true },
    coinColor:    { label: "Coin colour", group: "Colors", type: "color", def: "#FFC93C", options: ["#FFC93C", "#FFE07A", "#F5A623"], apply: "live", marketer: true },
    uiAccent:     { label: "Interface accent colour", group: "Colors", type: "color", def: "#FFC93C", options: ["#FFC93C", "#3FA9F5", "#FF4FA3", "#35D07F"], apply: "live", marketer: true },
  },
  difficultyOverrides: {
    easy: { maxSpeed: 14, levelTime: 44, lives: 5, trackWidth: 4.0, hammerPeriod: 3.4, sweeperRpm: 12, smashSpeed: 8, bandLen: 5 },
    hard: { maxSpeed: 16.5, levelTime: 27, lives: 2, trackWidth: 3.0, hammerPeriod: 2.3, sweeperRpm: 21, smashSpeed: 11.5, bandLen: 3.4 }
  },
  trailer: { levelTime: 25 },
  skins: [
    { id: "classic", a: "#3FA9F5", b: "#FF4FA3", price: 0 },
    { id: "bubblegum", a: "#FF4FA3", b: "#FFFFFF", price: 400 },
    { id: "mint", a: "#35D07F", b: "#FFFFFF", price: 800 },
    { id: "sunny", a: "#FFC93C", b: "#FF6A1A", price: 1200 },
    { id: "grape", a: "#9B6CFF", b: "#FFC93C", price: 1800 },
    { id: "lava", a: "#E5352B", b: "#FFB52E", price: 2500 },
    { id: "ocean", a: "#1C6FD1", b: "#7FE3FF", price: 3500 },
    { id: "snow", a: "#F4F8FF", b: "#9FC7FF", price: 5000 },
    { id: "night", a: "#1E2A4A", b: "#B99BFF", price: 7000 },
    { id: "gold", a: "#FFD23F", b: "#FF9A00", price: 10000 }
  ],
  worldGates: [0, 8, 20, 32]
};
