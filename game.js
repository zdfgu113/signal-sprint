const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const levelEl = document.querySelector("#level");
const chargeBar = document.querySelector("#chargeBar");
const curtain = document.querySelector("#curtain");
const startButton = document.querySelector("#startButton");

const lanes = 5;
const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem("signal-sprint-best") || 0),
  level: 1,
  charge: 0,
  playerLane: 2,
  speed: 190,
  spawnTimer: 0,
  lastTime: 0,
  shake: 0,
  objects: [],
  particles: [],
};

bestEl.textContent = state.best;

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * ratio));
  canvas.height = Math.max(420, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function laneX(lane) {
  const w = canvas.clientWidth;
  return (w * 0.18) + lane * ((w * 0.64) / (lanes - 1));
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.level = 1;
  state.charge = 35;
  state.playerLane = 2;
  state.speed = 190;
  state.spawnTimer = 0.2;
  state.lastTime = performance.now();
  state.shake = 0;
  state.objects = [];
  state.particles = [];
  curtain.classList.add("hidden");
  updateHud();
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  bestEl.textContent = state.best;
  levelEl.textContent = state.level;
  chargeBar.style.width = `${Math.max(0, Math.min(100, state.charge))}%`;
}

function spawnObject() {
  const roll = Math.random();
  const kind = roll > 0.9 ? "surge" : roll > 0.58 ? "cell" : "pulse";
  const lane = Math.floor(Math.random() * lanes);
  state.objects.push({
    kind,
    lane,
    y: -40,
    radius: kind === "surge" ? 18 : 15,
    spin: Math.random() * Math.PI,
  });
}

function burst(x, y, color, count = 16) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const power = 60 + Math.random() * 150;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: 0.45 + Math.random() * 0.35,
      color,
    });
  }
}

function gameOver() {
  state.running = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("signal-sprint-best", String(state.best));
  curtain.querySelector(".kicker").textContent = "Run Complete";
  curtain.querySelector("h1").textContent = `Score ${Math.floor(state.score)}`;
  startButton.textContent = "Run Again";
  curtain.classList.remove("hidden");
  updateHud();
}

function collect(object) {
  const x = laneX(object.lane);
  const y = object.y;
  if (object.kind === "pulse") {
    state.charge -= 34;
    state.shake = 0.18;
    burst(x, y, "#ff4c5e", 20);
    if (state.charge <= 0) {
      gameOver();
    }
    return;
  }

  if (object.kind === "surge") {
    state.score += 85;
    state.charge = Math.min(100, state.charge + 26);
    state.objects = state.objects.filter((item) => item.kind !== "pulse");
    burst(x, y, "#f6c945", 32);
    return;
  }

  state.score += 35;
  state.charge = Math.min(100, state.charge + 11);
  burst(x, y, "#43f4ff", 14);
}

function update(dt) {
  if (!state.running) return;

  state.score += dt * (18 + state.level * 4);
  state.charge -= dt * (5 + state.level * 0.45);
  state.level = 1 + Math.floor(state.score / 450);
  state.speed = 190 + state.level * 24;
  state.spawnTimer -= dt;
  state.shake = Math.max(0, state.shake - dt);

  if (state.spawnTimer <= 0) {
    spawnObject();
    state.spawnTimer = Math.max(0.28, 0.88 - state.level * 0.045);
  }

  for (const object of state.objects) {
    object.y += state.speed * dt;
    object.spin += dt * 5;
  }

  const playerY = canvas.clientHeight - 92;
  const hitRange = 34;
  const before = state.objects.length;
  state.objects = state.objects.filter((object) => {
    const hit = object.lane === state.playerLane && Math.abs(object.y - playerY) < hitRange;
    if (hit) collect(object);
    return !hit && object.y < canvas.clientHeight + 60;
  });

  if (before !== state.objects.length) {
    state.score += 2;
  }

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.charge <= 0) gameOver();
  updateHud();
}

function drawGrid(w, h) {
  ctx.strokeStyle = "rgba(143, 154, 163, 0.18)";
  ctx.lineWidth = 1;

  for (let i = 0; i < lanes; i += 1) {
    const x = laneX(i);
    ctx.beginPath();
    ctx.moveTo(x, 34);
    ctx.lineTo(x, h - 48);
    ctx.stroke();
  }

  for (let y = 42; y < h; y += 44) {
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, y);
    ctx.lineTo(w * 0.9, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawObject(object) {
  const x = laneX(object.lane);
  const color = object.kind === "pulse" ? "#ff4c5e" : object.kind === "surge" ? "#f6c945" : "#43f4ff";
  ctx.save();
  ctx.translate(x, object.y);
  ctx.rotate(object.spin);
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = color;
  ctx.fillStyle = object.kind === "pulse" ? "rgba(255, 76, 94, 0.16)" : "rgba(67, 244, 255, 0.14)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (object.kind === "pulse") {
    ctx.rect(-object.radius, -object.radius, object.radius * 2, object.radius * 2);
  } else {
    ctx.arc(0, 0, object.radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(h) {
  const x = laneX(state.playerLane);
  const y = h - 92;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "#72e08a";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#72e08a";
  ctx.strokeStyle = "#f3f0e8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(20, 16);
  ctx.lineTo(0, 8);
  ctx.lineTo(-20, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function render() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const offset = state.shake ? (Math.random() - 0.5) * state.shake * 34 : 0;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(offset, 0);
  ctx.fillStyle = "#090d10";
  ctx.fillRect(0, 0, w, h);
  drawGrid(w, h);

  for (const object of state.objects) drawObject(object);

  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  drawPlayer(h);

  ctx.fillStyle = "rgba(243, 240, 232, 0.7)";
  ctx.font = "700 12px Trebuchet MS";
  ctx.fillText("LANE " + (state.playerLane + 1), 24, h - 28);
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.04, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function move(direction) {
  if (!state.running) return;
  state.playerLane = Math.max(0, Math.min(lanes - 1, state.playerLane + direction));
}

window.addEventListener("resize", fitCanvas);
window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "a", "A"].includes(event.key)) move(-1);
  if (["ArrowRight", "d", "D"].includes(event.key)) move(1);
  if (event.key === " " && !state.running) resetGame();
});

let touchStart = null;
canvas.addEventListener("pointerdown", (event) => {
  touchStart = event.clientX;
  if (!state.running) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  let closest = 0;
  let distance = Infinity;
  for (let i = 0; i < lanes; i += 1) {
    const laneDistance = Math.abs(laneX(i) - x);
    if (laneDistance < distance) {
      closest = i;
      distance = laneDistance;
    }
  }
  state.playerLane = closest;
});

canvas.addEventListener("pointerup", (event) => {
  if (touchStart === null || !state.running) return;
  const delta = event.clientX - touchStart;
  if (Math.abs(delta) > 36) move(delta > 0 ? 1 : -1);
  touchStart = null;
});

startButton.addEventListener("click", resetGame);

fitCanvas();
render();
requestAnimationFrame(loop);
