const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// UI
const paramBranchColor = document.getElementById('branchColor');
const paramBranchInt = document.getElementById('branchIntensity');
const paramFlowerColor = document.getElementById('flowerColor');
const paramFlowerInt = document.getElementById('flowerIntensity');
const paramBranching = document.getElementById('param-branching');
const paramFlowers = document.getElementById('param-flowers');
const paramSpline = document.getElementById('spline-toggle');

// Color Stuff
function getHSLString(colorVal, intVal, depthRatio = 0) {
    colorVal = parseInt(colorVal);
    intVal = parseInt(intVal);
    
    let l = colorVal <= 10 ? 100 - (colorVal / 10) * 50 : 50;
    let h = colorVal <= 10 ? 0 : ((colorVal - 10) / 90) * 360;
    l = l * (intVal / 100);
    
    h += depthRatio * 18; 
    l += depthRatio * 20;
    
    return `hsl(${h}, 100%, ${l}%)`;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

// L-System Core
class LModule {
    constructor(symbol, params = []) {
        this.symbol = symbol;
        this.params = params;
    }
}

class ParametricLSystem {
    constructor() {
        this.rules = {
            'A': (params, globals) => {
                const len = params[0];
                let output = [new LModule('F', [len])];

                if (Math.random() < globals.flowerProb) {
                    output.push(new LModule('L'));
                }

                if (Math.random() < globals.branchProb) {
                    const numBranches = 1 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < numBranches; i++) {
                        const angle = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 40);
                        const shrink = 0.5 + Math.random() * 0.3; 
                        
                        output.push(new LModule('['));
                        output.push(new LModule('+', [angle]));
                        output.push(new LModule('A', [len * shrink])); 
                        output.push(new LModule(']'));
                    }
                }

                const bendAngle = (Math.random() - 0.5) * 30; 
                const mainShrink = 0.8 + Math.random() * 0.15;
                
                output.push(new LModule('+', [bendAngle]));
                output.push(new LModule('A', [len * mainShrink]));

                return output;
            }
        };
    }

    evaluate(axiom, iterations, globals) {
        let currentString = axiom;
        for (let i = 0; i < iterations; i++) {
            let nextString = [];
            for (let module of currentString) {
                if (this.rules[module.symbol]) {
                    nextString.push(...this.rules[module.symbol](module.params, globals));
                } else {
                    nextString.push(module);
                }
            }
            currentString = nextString;
        }
        
        let finalString = [];
        for (let module of currentString) {
            if (module.symbol === 'A') {
                finalString.push(new LModule('F', [module.params[0]]));
                if (Math.random() < globals.flowerProb) finalString.push(new LModule('L'));
            } else {
                finalString.push(module);
            }
        }
        return finalString;
    }
}

// 2D Bone Structure
class Bone {
    constructor(depth) {
        this.length = 0;
        this.targetRot = 0;
        this.currentRot = 0;
        this.globalRot = 0;
        this.globalPos = { x: 0, y: 0 };
        this.children = [];
        this.depth = depth;
        this.hasFlower = false;
    }
}

function parseStringIntoBones(parametricString) {
    const root = new Bone(0);
    let currentBone = root;
    let currentDepth = 0;
    let stack = [];
    let pendingRot = 0;
    let maxD = 0;

    for (const mod of parametricString) {
        switch (mod.symbol) {
            case 'F':
                const b = new Bone(currentDepth);
                b.length = mod.params[0];
                b.targetRot = pendingRot;
                currentBone.children.push(b);
                currentBone = b;
                pendingRot = 0;
                if (currentDepth > maxD) maxD = currentDepth;
                break;
            case '+':
                pendingRot += mod.params[0] * Math.PI / 180;
                break;
            case '[':
                stack.push({ bone: currentBone, rot: pendingRot, depth: currentDepth });
                currentDepth++;
                break;
            case ']':
                if (stack.length > 0) {
                    const state = stack.pop();
                    currentBone = state.bone;
                    pendingRot = state.rot;
                    currentDepth = state.depth;
                }
                break;
            case 'L':
                currentBone.hasFlower = true;
                break;
        }
    }
    return { root, maxDepth: maxD };
}

// Var
let rootBone = null;
let maxDepth = 0;
let useSplines = true; 
let viewScale = 1;
let viewOffsetX = 0;
let viewOffsetY = 0;

// The current flower recipe (changes on every generation)
let currentFlowerRecipe = {};

// Calculate boundaries to auto-frame the camera
function computeBounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    function traverseBounds(bone, parentPos, parentRot) {
        bone.globalRot = parentRot + bone.targetRot;
        bone.globalPos.x = parentPos.x + Math.cos(bone.globalRot) * bone.length;
        bone.globalPos.y = parentPos.y + Math.sin(bone.globalRot) * bone.length;
        
        if (bone.globalPos.x < minX) minX = bone.globalPos.x;
        if (bone.globalPos.x > maxX) maxX = bone.globalPos.x;
        if (bone.globalPos.y < minY) minY = bone.globalPos.y;
        if (bone.globalPos.y > maxY) maxY = bone.globalPos.y;

        for (let child of bone.children) traverseBounds(child, bone.globalPos, bone.globalRot);
    }
    
    traverseBounds(rootBone, {x: 0, y: 0}, -Math.PI / 2);
    
    const treeW = Math.max(0.1, maxX - minX);
    const treeH = Math.max(0.1, maxY - minY);
    
    viewScale = Math.min(width / treeW, height / treeH) * 0.7;
    viewOffsetX = width / 2 - ((minX + maxX) / 2) * viewScale;
    viewOffsetY = height / 2 - ((minY + maxY) / 2) * viewScale;
}

// --- NEW INFINITE FLOWER DRAWING LOGIC ---
function drawFlower(x, y, rot, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot + Math.PI/2); 
    
    // Décalage pour aligner la base de la fleur sur la branche
    ctx.translate(0, 0.3); 
    ctx.scale(scale, scale);
    
    // On dessine de 2 à 3 couches (layers) pour simuler la fleur infinie de façon "light"
    for (let l = 0; l < currentFlowerRecipe.layers; l++) {
        // Chaque couche intérieure est plus petite et pivote légèrement
        const layerScale = Math.pow(currentFlowerRecipe.layerScale, l);
        ctx.save();
        ctx.scale(layerScale, layerScale);
        ctx.rotate(l * currentFlowerRecipe.layerOffset);
        
        // On rend les couches intérieures légèrement plus claires/brillantes
        ctx.fillStyle = getHSLString(paramFlowerColor.value, paramFlowerInt.value, l * 0.15);
        
        for (let i = 0; i < currentFlowerRecipe.petals; i++) {
            ctx.rotate((Math.PI * 2) / currentFlowerRecipe.petals);
            
            ctx.beginPath();
            ctx.moveTo(0, 0); // Centre
            
            // Courbe de Bézier gauche
            ctx.bezierCurveTo(
                -currentFlowerRecipe.width, currentFlowerRecipe.length * 0.3,
                -currentFlowerRecipe.width * 0.2, currentFlowerRecipe.length * 0.8,
                0, currentFlowerRecipe.length
            );
            
            // Courbe de Bézier droite
            ctx.bezierCurveTo(
                currentFlowerRecipe.width * 0.2, currentFlowerRecipe.length * 0.8,
                currentFlowerRecipe.width, currentFlowerRecipe.length * 0.3,
                0, 0
            );
            
            ctx.fill();
        }
        ctx.restore(); // Fin du Layer
    }
    
    ctx.restore(); // Fin de la Fleur
}

// Recursive Rendering
function traverseDraw(bone, parentPos, parentRot, globalT, flowerList) {
    const delay = bone.depth * 0.08; 
    const localT = Math.max(0, Math.min(1.0, (globalT - delay) * 2.5)); 
    const easedT = easeOutCubic(localT);

    bone.currentRot = bone.targetRot * easedT; 
    bone.globalRot = parentRot + bone.currentRot;

    const dirX = Math.cos(bone.globalRot);
    const dirY = Math.sin(bone.globalRot);
    
    const currentLen = bone.length * easedT; 

    bone.globalPos.x = parentPos.x + dirX * currentLen;
    bone.globalPos.y = parentPos.y + dirY * currentLen;

    if (currentLen > 0 && localT > 0) {
        const parentDirX = Math.cos(parentRot);
        const parentDirY = Math.sin(parentRot);

        const cp1x = parentPos.x + parentDirX * currentLen * 0.4;
        const cp1y = parentPos.y + parentDirY * currentLen * 0.4;
        const cp2x = bone.globalPos.x - dirX * currentLen * 0.4;
        const cp2y = bone.globalPos.y - dirY * currentLen * 0.4;

        ctx.beginPath();
        ctx.moveTo(parentPos.x, parentPos.y);
        if (useSplines) {
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bone.globalPos.x, bone.globalPos.y);
        } else {
            ctx.lineTo(bone.globalPos.x, bone.globalPos.y);
        }
        
        ctx.strokeStyle = getHSLString(paramBranchColor.value, paramBranchInt.value, bone.depth / Math.max(1, maxDepth));
        ctx.lineWidth = Math.max(0.2, (2.0 - (bone.depth * 0.25)) / viewScale); 
        ctx.stroke();
    }

    if (bone.hasFlower) {
        const flowerT = Math.max(0, Math.min(1.0, (globalT - (delay + 0.1)) * 3.0));
        if (flowerT > 0) {
            flowerList.push({
                x: bone.globalPos.x,
                y: bone.globalPos.y,
                rot: bone.globalRot,
                scale: easeOutElastic(flowerT)
            });
        }
    }

    for (let child of bone.children) {
        traverseDraw(child, bone.globalPos, bone.globalRot, globalT, flowerList);
    }
}

// UI Listeners
paramBranching.addEventListener('input', e => document.getElementById('val-branching').innerText = e.target.value + '%');
paramFlowers.addEventListener('input', e => document.getElementById('val-flowers').innerText = e.target.value + '%');

paramSpline.addEventListener('click', function() {
    this.classList.toggle('active');
    useSplines = this.classList.contains('active');
});

let lastTime = 0; 
let animProgress = 0;
let isAnimating = false;

function generate() {
    const globals = {
        branchProb: parseFloat(paramBranching.value) / 100.0,
        flowerProb: (parseFloat(paramFlowers.value) / 100.0) * 0.15
    };

    const lSystemEngine = new ParametricLSystem();
    const axiom = [new LModule('A', [10.0])];
    const finalString = lSystemEngine.evaluate(axiom, 7, globals);

    document.getElementById('stats-display').innerText = `String Length: ${finalString.length} Modules`;

    const parseResult = parseStringIntoBones(finalString);
    rootBone = parseResult.root;
    maxDepth = parseResult.maxDepth;

    // --- On génère une nouvelle espèce de fleur géométrique ---
    currentFlowerRecipe = {
        petals: 5 + Math.floor(Math.random() * 6), // 5 à 10 pétales
        layers: 2 + Math.floor(Math.random() * 2), // 2 ou 3 couches superposées
        length: 1.0,
        width: 0.15 + Math.random() * 0.35,        // Pétales fins ou épais
        layerOffset: (Math.random() * Math.PI) / 4, // Rotation de la sous-couche
        layerScale: 0.5 + Math.random() * 0.3      // Réduction de taille par couche
    };

    computeBounds();

    animProgress = 0;
    lastTime = 0;
    isAnimating = true;
}

function animate(time) {
    requestAnimationFrame(animate);

    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    ctx.fillStyle = "#020203";
    ctx.fillRect(0, 0, width, height);

    if (isAnimating) {
        animProgress += (dt / 1000) * 0.4;
        
        if (animProgress >= 1.5) { 
            animProgress = 1.5;
            isAnimating = false;
        }
    }

    if (rootBone) {
        ctx.save();
        ctx.translate(viewOffsetX, viewOffsetY);
        ctx.scale(viewScale, viewScale);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        const flowersToDraw = [];
        
        traverseDraw(rootBone, {x:0, y:0}, -Math.PI / 2, animProgress, flowersToDraw);
        
        for (let f of flowersToDraw) {
            drawFlower(f.x, f.y, f.rot, f.scale);
        }
        
        ctx.restore();
    }
}

document.getElementById('btn-generate').addEventListener('click', generate);

// Init
generate();
requestAnimationFrame(animate);