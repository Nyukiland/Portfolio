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

// Window Resize Management
function resize()
{
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    
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

window.addEventListener('mousedown', () => 
{
    mouse.isDown = true;
});

window.addEventListener('mouseup', () => 
{
    mouse.isDown = false;
});

window.addEventListener('mouseleave', () => 
{
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
        
        // Logical position (drifting freely)
        this.logicalX = Math.random() * width;
        this.logicalY = Math.random() * height;
        
        // Visual position (drawn on screen)
        this.x = this.logicalX;
        this.y = this.logicalY;
        
        this.z = layerZ; 
        this.depthScale = 1.3 - this.z; 
        
        this.baseRadius = 90 + (Math.random() * 60); 
        this.targetRadius = this.baseRadius * this.depthScale;
        this.currentRadius = this.targetRadius;
        
        this.vx = (Math.random() - 0.5) * 0.25 * this.z;
        this.vy = (Math.random() - 0.5) * 0.25 * this.z;

        // Base colors (boosted to prevent black crush)
        const redShade = Math.floor(25 * this.z); 
        this.baseR = redShade;
        this.baseG = Math.floor(redShade * 0.05);
        this.baseB = Math.floor(redShade * 0.15); 
        
        // Active colors (Cyan)
        this.activeR = 0;
        this.activeG = 220;
        this.activeB = 255;

        this.r = this.baseR;
        this.g = this.baseG;
        this.b = this.baseB;
        
        this.strokeAlpha = 0.1 + 0.25 * this.z;
        this.printOffset = 2 + (5 * (1 - this.z)); 
    }

    update() 
    {
        this.logicalX += this.vx;
        this.logicalY += this.vy;

        const padding = this.baseRadius * 2;

        if (this.logicalX < -padding) { this.logicalX += width + padding * 2; this.x += width + padding * 2; }
        if (this.logicalX > width + padding) { this.logicalX -= width + padding * 2; this.x -= width + padding * 2; }
        if (this.logicalY < -padding) { this.logicalY += height + padding * 2; this.y += height + padding * 2; }
        if (this.logicalY > height + padding) { this.logicalY -= height + padding * 2; this.y -= height + padding * 2; }

        let distFactor = 1.0;
        let targetX = this.logicalX;
        let targetY = this.logicalY;

        if (mouse.isActive && !window.isInteractionPaused) 
        {
            const dx = mouse.x - this.logicalX;
            const dy = mouse.y - this.logicalY;
            const distSq = dx * dx + dy * dy;

            const range = mouse.isDown ? DEFORMATION_RANGE * 1.5 : DEFORMATION_RANGE;
            const rangeSq = range * range;

            if (distSq < rangeSq) 
            {
                const dist = Math.max(1, Math.sqrt(distSq)); 
                
                distFactor = Math.max(0.08, dist / range);
                distFactor = distFactor * distFactor; 

                let force = (range - dist) / range; 
                let pushStrength = mouse.isDown ? 250 : 80; 
                let pushMultiplier = force * pushStrength * this.depthScale;

                targetX -= (dx / dist) * pushMultiplier;
                targetY -= (dy / dist) * pushMultiplier;
            }
        }

        this.x += (targetX - this.x) * 0.08;
        this.y += (targetY - this.y) * 0.08;

        this.targetRadius = (this.baseRadius * this.depthScale) * distFactor; 
        
        const radiusDiff = this.targetRadius - this.currentRadius;
        if (Math.abs(radiusDiff) > 0.1)
        {
            this.currentRadius += radiusDiff * 0.15;
            
            const sizeRatio = this.currentRadius / (this.baseRadius * this.depthScale);
            // Replaced Math.pow with simple clamping
            const t = Math.max(0, Math.min(1, 1.0 - sizeRatio)); 
            
            this.r = Math.floor(this.baseR + (this.activeR - this.baseR) * t);
            this.g = Math.floor(this.baseG + (this.activeG - this.baseG) * t);
            this.b = Math.floor(this.baseB + (this.activeB - this.baseB) * t);
            
            this.cachedColor = `rgb(${this.r}, ${this.g}, ${this.b})`;
            this.cachedStroke = `rgba(${this.r + 40}, ${this.g}, ${this.b}, ${this.strokeAlpha})`;
        }
        else if (!this.cachedColor)
        {
            this.cachedColor = `rgb(${this.r}, ${this.g}, ${this.b})`;
            this.cachedStroke = `rgba(${this.r + 40}, ${this.g}, ${this.b}, ${this.strokeAlpha})`;
        }
    }

    draw() 
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = this.cachedColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x - this.printOffset, this.y + this.printOffset, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
        ctx.strokeStyle = this.cachedStroke;
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