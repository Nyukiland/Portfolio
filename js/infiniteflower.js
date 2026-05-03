// Globals
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const bgColorInput = document.getElementById("bgColor");
const bgIntInput = document.getElementById("bgIntensity");
const flowerColorInput = document.getElementById("flowerColor");
const flowerIntInput = document.getElementById("flowerIntensity");
const lineColorInput = document.getElementById("lineColor");
const lineIntInput = document.getElementById("lineIntensity");

let width, height;
let rings = []; 
let globalRotation = 0;
let timeOffset = Date.now(); 
let spawnTimer = 0;
let timeUntilNextRing = 0;
let currentRingAngleOffset = 0;

// Color math
function getColorFromSliders(colorVal, intVal) {
  colorVal = parseInt(colorVal);
  intVal = parseInt(intVal);
  
  let l = colorVal <= 10 ? 100 - (colorVal / 10) * 50 : 50;
  let h = colorVal <= 10 ? 0 : ((colorVal - 10) / 90) * 360;
  
  l = l * (intVal / 100);
  
  return `hsl(${h}, 100%, ${l}%)`;
}

// Resize
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Bezier math
function splitBezier1D(t, p0, p1, p2, p3) {
  const p01 = p0 + (p1 - p0) * t, p12 = p1 + (p2 - p1) * t, p23 = p2 + (p3 - p2) * t;
  const p012 = p01 + (p12 - p01) * t, p123 = p12 + (p23 - p12) * t;
  return [p0, p01, p012, p012 + (p123 - p012) * t];
}

// Petal class
const PETAL_DURATION = 1150.0;
class Petal {
  constructor(angle, scale, lengthRatio, widthFactor, cY1Factor, cY2Factor, asymFactor, delay) {
    this.angle = angle;
    this.scale = scale;
    this.lengthRatio = lengthRatio;
    this.growthTimer = -delay;
    this.cY1 = cY1Factor;
    this.cY2 = cY2Factor;
    const shift1 = widthFactor * asymFactor * 1.0;
    const shift2 = widthFactor * asymFactor * 1.6;
    this.r_cp1x = widthFactor * 1.5 + shift1;
    this.r_cp2x = widthFactor * 0.5 + shift2;
    this.l_cp1x = -widthFactor * 1.5 + shift1;
    this.l_cp2x = -widthFactor * 0.5 + shift2;
  }

  update(shrinkRate, dt) {
    this.scale *= shrinkRate;
    this.growthTimer += dt;
  }

  draw(targetCtx) {
    if (this.growthTimer <= 0) return;

    targetCtx.save();
    
    targetCtx.globalAlpha = this.scale < 0.15 ? Math.max(0, (this.scale - 0.1) / 0.05) : 1.0;
    
    targetCtx.rotate(this.angle);
    targetCtx.scale(this.scale, this.scale);

    const l = (Math.min(width, height) / 2.2) * this.lengthRatio;
    
    const cY1 = this.cY1 * l, cY2 = this.cY2 * l;
    const r1 = this.r_cp1x * l, r2 = this.r_cp2x * l;
    const l1 = this.l_cp1x * l, l2 = this.l_cp2x * l;
    let g = Math.min((this.growthTimer / PETAL_DURATION) * 2.0, 2.0);

    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);

    if (g <= 1.0) {
      const t = 1 - Math.pow(1 - g, 3);
      const rx = splitBezier1D(t, 0, r1, r2, 0);
      const ry = splitBezier1D(t, 0, cY1, cY2, l);
      targetCtx.bezierCurveTo(rx[1], ry[1], rx[2], ry[2], rx[3], ry[3]);
      targetCtx.lineTo(0, 0);
    } else {
      targetCtx.bezierCurveTo(r1, cY1, r2, cY2, 0, l);
      const t = 1 - Math.pow(1 - (g - 1.0), 3);
      const lx = splitBezier1D(t, 0, l2, l1, 0);
      const ly = splitBezier1D(t, l, cY2, cY1, 0);
      targetCtx.bezierCurveTo(lx[1], ly[1], lx[2], ly[2], lx[3], ly[3]);
    }

    targetCtx.fillStyle = getColorFromSliders(flowerColorInput.value, flowerIntInput.value);
    targetCtx.fill();
    targetCtx.lineWidth = Math.min(1.5 / this.scale, 5);
    targetCtx.strokeStyle = getColorFromSliders(lineColorInput.value, lineIntInput.value);
    targetCtx.lineJoin = "round";
    targetCtx.stroke();
    targetCtx.restore();
  }
}

// Spawner
function spawnRing(time) {
  const seed = (time + timeOffset) * 0.00005;
  const numPetals = [6, 8, 10, 12][Math.floor((time + timeOffset) * 0.000015) % 4];
  const angleStep = (Math.PI * 2) / numPetals;
  currentRingAngleOffset += angleStep * 0.5;

  const STAGGER_MS = PETAL_DURATION; 
  const halfPetals = numPetals / 2;
  let newRing = [];

  for (let i = 0; i < numPetals; i++) {
    const worldAngle = (i * angleStep) + currentRingAngleOffset;
    const flow = Math.pow((Math.sin((3 + Math.floor((time + timeOffset) * 0.000015) % 4) * worldAngle + seed * 10.0) + 1) / 2, 1.5) * 2 - 1;
    
    const delay = (i % halfPetals) * STAGGER_MS;

    newRing.push(new Petal(
      worldAngle,
      1.0,
      1.4 * (1.0 + flow * 0.1), 
      (0.28 + (Math.cos(seed * 1.8) + 1) * 0.15) * (1.0 + flow * 0.12),
      0.2 + (Math.sin(seed * 2.2) + 1) * 0.25,
      0.5 + (Math.cos(seed * 1.5) + 1) * 0.25,
      (Math.sin(seed * 4.3) * 0.35) + flow * 0.1,
      delay 
    ));
  }
  
  rings.push(newRing);
  
  const maxSequenceDelay = (halfPetals - 1) * STAGGER_MS;
  const ringTotalDrawTime = maxSequenceDelay + PETAL_DURATION;
  timeUntilNextRing = ringTotalDrawTime + 3000; 
}

// Screenshot
function captureFlower() {
  const size = 2048;
  const offscreen = document.createElement("canvas");
  offscreen.width = offscreen.height = size;
  const octx = offscreen.getContext("2d");

  octx.fillStyle = getColorFromSliders(bgColorInput.value, bgIntInput.value);
  octx.fillRect(0, 0, size, size);
  octx.save();
  octx.translate(size / 2, size / 2);
  octx.rotate(globalRotation);

  const tempW = width, tempH = height;
  width = height = size; 
  for (let r = rings.length - 1; r >= 0; r--) {
      for (let i = rings[r].length - 1; i >= 0; i--) {
          rings[r][i].draw(octx);
      }
  }
  width = tempW; height = tempH;

  octx.restore();

  const link = document.createElement("a");
  link.download = `flower_${Date.now()}.png`;
  link.href = offscreen.toDataURL("image/png");
  link.click();
}

// Main loop
let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  const dt = time - lastTime;
  lastTime = time;

  ctx.fillStyle = getColorFromSliders(bgColorInput.value, bgIntInput.value);
  ctx.fillRect(0, 0, width, height);

  spawnTimer += dt;
  if (spawnTimer >= timeUntilNextRing || rings.length === 0) {
    spawnRing(time);
    spawnTimer = 0;
  }

  const shrinkRate = Math.pow(0.9988, dt / 16.66);
  
  for (let r = 0; r < rings.length; r++) {
      rings[r] = rings[r].filter(p => {
          p.update(shrinkRate, dt);
          return p.scale >= 0.05;
      });
  }
  rings = rings.filter(ring => ring.length > 0);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(globalRotation = time * 0.00008);
  
  for (let r = rings.length - 1; r >= 0; r--) {
      for (let i = rings[r].length - 1; i >= 0; i--) {
          rings[r][i].draw(ctx);
      }
  }
  
  ctx.restore();
}

requestAnimationFrame(animate);