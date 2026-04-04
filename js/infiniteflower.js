const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height, maxRadius;
let petals = [];
let globalRotation = 0;

// Input tracking
const mouse = { x: 0, y: 0, smoothedX: 0, smoothedY: 0 };
let timeOffset = Date.now(); // Acts as the unique starting seed

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
  if (mouse.x === 0 && mouse.y === 0) {
    mouse.x = mouse.smoothedX = width / 2;
    mouse.y = mouse.smoothedY = height / 2;
  }
}

window.addEventListener("resize", resize);
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("touchmove", (e) => {
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
});

resize();

// De Casteljau's algorithm to split a 1D cubic bezier at time t
function splitBezier1D(t, p0, p1, p2, p3) {
  const p01 = p0 + (p1 - p0) * t;
  const p12 = p1 + (p2 - p1) * t;
  const p23 = p2 + (p3 - p2) * t;
  const p012 = p01 + (p12 - p01) * t;
  const p123 = p12 + (p23 - p12) * t;
  const p0123 = p012 + (p123 - p012) * t;
  return [p0, p01, p012, p0123];
}

const PETAL_DRAW_DURATION = 1500.0;

class Petal {
  constructor(
    angle,
    scale,
    lengthRatio,
    widthFactor,
    cY1Factor,
    cY2Factor,
    asymFactor,
    delay,
  ) {
    this.angle = angle;
    this.scale = scale;
    this.lengthRatio = lengthRatio;
    this.growthTimer = -delay;

    const l = 1.0;
    const w = l * widthFactor;

    this.cY1 = l * cY1Factor;
    this.cY2 = l * cY2Factor;

    const shift1 = w * asymFactor * 1.0;
    const shift2 = w * asymFactor * 1.6;

    this.r_cp1x = w * 1.5 + shift1;
    this.r_cp2x = w * 0.5 + shift2;

    this.l_cp1x = -w * 1.5 + shift1;
    this.l_cp2x = -w * 0.5 + shift2;
  }

  update(shrinkRate, deltaTime) {
    this.scale *= shrinkRate;
    this.growthTimer += deltaTime;
  }

  draw(targetCtx) {
    if (this.growthTimer <= 0) return;

    targetCtx.save();

    const fadeStart = 0.4;
    const fadeEnd = 0.25;
    let alpha = 1.0;

    if (this.scale < fadeStart) {
      alpha = Math.max(0, (this.scale - fadeEnd) / (fadeStart - fadeEnd));
    }
    targetCtx.globalAlpha = alpha;

    targetCtx.rotate(this.angle);
    targetCtx.scale(this.scale, this.scale);

    const l = Math.min(width, height) * this.lengthRatio;
    
    const cY1 = this.cY1 * l;
    const cY2 = this.cY2 * l;
    const r_cp1x = this.r_cp1x * l;
    const r_cp2x = this.r_cp2x * l;
    const l_cp1x = this.l_cp1x * l;
    const l_cp2x = this.l_cp2x * l;

    let g = (this.growthTimer / PETAL_DRAW_DURATION) * 2.0;
    if (g > 2.0) g = 2.0;

    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);

    if (g <= 1.0) {
      const t = 1 - Math.pow(1 - g, 3);
      const rx = splitBezier1D(t, 0, r_cp1x, r_cp2x, 0);
      const ry = splitBezier1D(t, 0, cY1, cY2, l);

      targetCtx.bezierCurveTo(rx[1], ry[1], rx[2], ry[2], rx[3], ry[3]);
      targetCtx.lineTo(0, 0);
    } else {
      targetCtx.bezierCurveTo(r_cp1x, cY1, r_cp2x, cY2, 0, l);

      const t = 1 - Math.pow(1 - (g - 1.0), 3);
      const lx = splitBezier1D(t, 0, l_cp2x, l_cp1x, 0);
      const ly = splitBezier1D(t, l, cY2, cY1, 0);

      targetCtx.bezierCurveTo(lx[1], ly[1], lx[2], ly[2], lx[3], ly[3]);
    }

    targetCtx.fillStyle = "#000";
    targetCtx.fill();

    targetCtx.lineWidth = 1.5 / this.scale;
    if (targetCtx.lineWidth > 5) targetCtx.lineWidth = 5;

    targetCtx.strokeStyle = "#FFF";
    targetCtx.lineJoin = "round";
    targetCtx.stroke();

    targetCtx.restore();
  }
}

let currentRingAngleOffset = 0;
let timeUntilNextRing = 0;
let spawnTimer = 0;

function spawnRing(time) {
  const seed = (time + timeOffset) * 0.00005;
  const speciesSeed = Math.floor((time + timeOffset) * 0.000015);

  const petalCounts = [6, 8, 10, 12];
  const numPetals = petalCounts[speciesSeed % petalCounts.length];
  const halfPetals = numPetals / 2;

  const baseWidthFactor = 0.28 + (Math.cos(seed * 1.8) + 1) * 0.15;
  const cY1Factor = 0.2 + (Math.sin(seed * 2.2) + 1) * 0.25;
  const cY2Factor = 0.5 + (Math.cos(seed * 1.5) + 1) * 0.25;
  const baseAsymFactor = Math.sin(seed * 4.3) * 0.35;

  const spawnScale = 1.0;
  const angleStep = (Math.PI * 2) / numPetals;

  currentRingAngleOffset += angleStep * 0.5;

  const symmetryOrder = 3 + (speciesSeed % 4);
  const flowPhase = seed * 10.0;

  const totalRingDrawTime = 3500;
  const staggerDelay =
    (totalRingDrawTime - PETAL_DRAW_DURATION) / Math.max(1, halfPetals - 1);

 for (let i = 0; i < numPetals; i++) {
    let localAngle = i * angleStep;
    let worldAngle = localAngle + currentRingAngleOffset;

    let rawFlow = Math.sin(symmetryOrder * worldAngle + flowPhase);
    let flow = Math.pow((rawFlow + 1) / 2, 1.5) * 2 - 1;

    let pLengthRatio = 0.65 * (1.0 + flow * 0.1);
    let pWidth = baseWidthFactor * (1.0 + flow * 0.12);
    let pAsym = baseAsymFactor + flow * 0.1;

    let delayIndex = i % halfPetals;

    petals.push(
      new Petal(
        worldAngle,
        spawnScale,
        pLengthRatio,
        pWidth,
        cY1Factor,
        cY2Factor,
        pAsym,
        delayIndex * staggerDelay,
      ),
    );
  }

  const ringPause = 1200;
  timeUntilNextRing = totalRingDrawTime + ringPause;
}

function captureFlower() {
  const captureSize = 2048;
  const offscreen = document.createElement("canvas");
  offscreen.width = captureSize;
  offscreen.height = captureSize;
  const octx = offscreen.getContext("2d");

  octx.fillStyle = "#000";
  octx.fillRect(0, 0, captureSize, captureSize);

  octx.save();
  octx.translate(captureSize / 2, captureSize / 2);
  octx.rotate(globalRotation);

  for (let i = petals.length - 1; i >= 0; i--) {
    petals[i].draw(octx);
  }

  octx.restore();

  const link = document.createElement("a");
  link.download = `flower_${Date.now()}.png`;
  link.href = offscreen.toDataURL("image/png");
  link.click();
}

let lastTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  const deltaTime = time - lastTime;
  lastTime = time;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const targetShrinkRate = 0.9985;
  const shrinkRate = Math.pow(targetShrinkRate, deltaTime / 16.66);

  spawnTimer += deltaTime;
  if (spawnTimer >= timeUntilNextRing || petals.length === 0) {
    spawnRing(time);
    spawnTimer = 0;
  }

  let activePetals = [];
  for (let i = 0; i < petals.length; i++) {
    petals[i].update(shrinkRate, deltaTime);
    if (petals[i].scale >= 0.25) {
      activePetals.push(petals[i]);
    }
  }
  petals = activePetals;

  ctx.save();
  ctx.translate(width / 2, height / 2);

  globalRotation = time * 0.00005;
  ctx.rotate(globalRotation);

  for (let i = petals.length - 1; i >= 0; i--) {
    petals[i].draw(ctx);
  }

  ctx.restore();
}

requestAnimationFrame(animate);
