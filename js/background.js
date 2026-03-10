// Globals
window.isInteractionPaused = false;

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

let width, height;
let mouse = {
    x: undefined,
    y: undefined,
    isActive: false,
    radius: 120,
    isDown: false 
};

const DEFORMATION_RANGE = 350; 
let resizeTimeout;

// Window Resize
function resize()
{
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(dpr, dpr);

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initParticles, 150);
}

window.addEventListener('resize', resize);

// Mouse Events
function updateMouse(x, y, active)
{
    mouse.x = x;
    mouse.y = y;
    mouse.isActive = active;
}

window.addEventListener('mousemove', (e) =>
{
    updateMouse(e.clientX, e.clientY, true);
});

window.addEventListener('mouseout', () =>
{
    updateMouse(-1000, -1000, false);
});

window.addEventListener('mousedown', () => {
    mouse.isDown = true;
});

window.addEventListener('mouseup', () => {
    mouse.isDown = false;
});

window.addEventListener('mouseleave', () => {
    mouse.isDown = false;
    mouse.x = undefined;
    mouse.y = undefined;
});

window.addEventListener('touchstart', (e) =>
{
    if (e.touches.length > 0)
    {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY, true);
    }
}, { passive: true });

window.addEventListener('touchend', () =>
{
    updateMouse(-1000, -1000, false);
    mouse.isDown = false;
});

// Particle Class
class Particle
{
    constructor(id, layerZ)
    {
        this.id = id;
        
        // Coordonnées logiques (celles qui continuent de flotter)
        this.logicalX = Math.random() * width;
        this.logicalY = Math.random() * height;
        
        // Coordonnées d'affichage (celles qu'on dessine)
        this.x = this.logicalX;
        this.y = this.logicalY;
        
        this.z = layerZ; 
        this.depthScale = 1.3 - this.z; 
        
        this.baseRadius = 90 + (Math.random() * 60); 
        this.targetRadius = this.baseRadius * this.depthScale;
        this.currentRadius = this.targetRadius;
        
        this.vx = (Math.random() - 0.5) * 0.25 * this.z;
        this.vy = (Math.random() - 0.5) * 0.25 * this.z;

        const redShade = Math.floor(2 + 18 * this.z); 
        this.baseR = redShade;
        this.baseG = 0;
        this.baseB = Math.floor(redShade * 0.1); 
        
        this.activeR = 0;
        this.activeG = 200;
        this.activeB = 255;

        this.r = this.baseR;
        this.g = this.baseG;
        this.b = this.baseB;
        
        this.strokeAlpha = 0.05 + 0.1 * this.z;
        this.printOffset = 2 + (5 * (1 - this.z)); 
    }

    update()
    {
        // 1. Dérive constante des coordonnées logiques
        this.logicalX += this.vx;
        this.logicalY += this.vy;

        // 2. Wrap-around (rebouclage sur les bords)
        // On déplace la position logique ET l'affichage pour éviter un "saut" visuel traversant l'écran
        const padding = this.baseRadius * 2;
        if (this.logicalX < -padding) { this.logicalX += width + padding * 2; this.x += width + padding * 2; }
        if (this.logicalX > width + padding) { this.logicalX -= width + padding * 2; this.x -= width + padding * 2; }
        if (this.logicalY < -padding) { this.logicalY += height + padding * 2; this.y += height + padding * 2; }
        if (this.logicalY > height + padding) { this.logicalY -= height + padding * 2; this.y -= height + padding * 2; }

        let distFactor = 1.0;
        
        // Par défaut, la cible visuelle est la position logique
        let targetX = this.logicalX;
        let targetY = this.logicalY;

        // 3. Interaction avec la souris (Création du point cible repoussé)
        if (mouse.isActive && !window.isInteractionPaused)
        {
            // On calcule la distance par rapport à la position logique pour une stabilité mathématique
            const dx = mouse.x - this.logicalX;
            const dy = mouse.y - this.logicalY;
            const distSq = dx * dx + dy * dy;

            const currentRange = mouse.isDown ? DEFORMATION_RANGE * 1.5 : DEFORMATION_RANGE;

            if (distSq < currentRange * currentRange)
            {
                const dist = Math.max(1, Math.sqrt(distSq)); 
                
                distFactor = Math.max(0.08, dist / currentRange);
                distFactor = Math.pow(distFactor, 1.2);

                let force = (currentRange - dist) / currentRange; 
                
                // Puissance de la répulsion en pixels (250px si cliqué, 80px au survol)
                let pushStrength = mouse.isDown ? 250 : 80; 
                let pushMultiplier = force * pushStrength * this.depthScale;

                // On modifie la cible vers l'opposé de la souris
                targetX -= (dx / dist) * pushMultiplier;
                targetY -= (dy / dist) * pushMultiplier;
            }
        }

        // 4. Physique du ressort (Spring/Lerp) - On approche X/Y de TargetX/TargetY
        // 0.08 définit la "rigidité" de l'élastique (plus proche de 1 = plus sec, plus proche de 0 = plus mou)
        this.x += (targetX - this.x) * 0.08;
        this.y += (targetY - this.y) * 0.08;

        // 5. Interpolation de la taille et de la couleur
        this.targetRadius = (this.baseRadius * this.depthScale) * distFactor; 
        this.currentRadius += (this.targetRadius - this.currentRadius) * 0.15;

        const sizeRatio = this.currentRadius / (this.baseRadius * this.depthScale);
        const t = Math.max(0, Math.min(1, Math.pow(1.0 - sizeRatio, 1.5))); 

        this.r = Math.floor(this.baseR + (this.activeR - this.baseR) * t);
        this.g = Math.floor(this.baseG + (this.activeG - this.baseG) * t);
        this.b = Math.floor(this.baseB + (this.activeB - this.baseB) * t);
    }

    draw()
    {
        const colorString = `rgb(${this.r}, ${this.g}, ${this.b})`;

        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = colorString;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x - this.printOffset, this.y + this.printOffset, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.r + 20}, ${this.g}, ${this.b}, ${this.strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Particle Generation
const particles = [];
const layerCounts = [200, 100, 60, 40, 25, 10]; 

function initParticles()
{
    particles.length = 0; 

    layerCounts.forEach((count, index) =>
    {
        const layerZ = Math.pow((index + 1) / layerCounts.length, 1.5); 
        for (let i = 0; i < count; i++)
        {
            particles.push(new Particle(particles.length, layerZ));
        }
    });

    particles.sort((a, b) => a.z - b.z);
}

// Main Loop
function animate()
{
    ctx.fillStyle = '#020005'; 
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++)
    {
        particles[i].update();
        particles[i].draw();
    }

    requestAnimationFrame(animate); 
}

resize();
initParticles();
animate();