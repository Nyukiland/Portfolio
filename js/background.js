// Globals
window.isInteractionPaused = false;

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

let width, height;
const mouse = { x: -1000, y: -1000, isActive: false };

const DEFORMATION_RANGE = 350; 
let globalTime = 0;
let globalGlitch = 0;
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
});

// Click Action
window.addEventListener('mousedown', (e) =>
{
    if (window.isInteractionPaused)
    {
        return;
    }

    if (e.target.tagName !== 'A' && e.target.tagName !== 'VIDEO' && e.target.tagName !== 'IMG') 
    {
        globalGlitch = 0.5; 
    }
});

window.addEventListener('touchstart', (e) => 
{
    if (window.isInteractionPaused)
    {
        return;
    }

    if (e.touches.length > 0 && e.target.tagName !== 'A' && e.target.tagName !== 'VIDEO' && e.target.tagName !== 'IMG') 
    {
        globalGlitch = 0.5;
    }
});

// Particle Class
class Particle
{
    constructor(id, layerZ)
    {
        this.id = id;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        
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
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -this.baseRadius)
        {
            this.x = width + this.baseRadius;
        }
        if (this.x > width + this.baseRadius)
        {
            this.x = -this.baseRadius;
        }
        if (this.y < -this.baseRadius)
        {
            this.y = height + this.baseRadius;
        }
        if (this.y > height + this.baseRadius)
        {
            this.y = -this.baseRadius;
        }

        let distFactor = 1.0;

        if (mouse.isActive && !window.isInteractionPaused)
        {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < DEFORMATION_RANGE * DEFORMATION_RANGE)
            {
                const dist = Math.sqrt(distSq);
                distFactor = Math.max(0.08, dist / DEFORMATION_RANGE);
                distFactor = Math.pow(distFactor, 1.2);
            }
        }

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
        if (globalGlitch > 0 && !window.isInteractionPaused)
        {
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 1 + (4 * globalGlitch); 
            
            const cx = this.x + (Math.random() - 0.5) * 40 * globalGlitch * this.depthScale;
            const cy = this.y + (Math.random() - 0.5) * 40 * globalGlitch * this.depthScale;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${globalGlitch * 0.9})`;
            ctx.stroke();

            const mx = this.x + (Math.random() - 0.5) * 40 * globalGlitch * this.depthScale;
            const my = this.y + (Math.random() - 0.5) * 40 * globalGlitch * this.depthScale;
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 100, ${globalGlitch * 0.9})`;
            ctx.stroke();
            
            ctx.globalCompositeOperation = 'source-over';
        }

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
    globalTime += 0.04;
    
    if (globalGlitch > 0)
    {
        globalGlitch = Math.max(0, globalGlitch - 0.05); 
    }

    ctx.fillStyle = '#030001'; 
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    if (globalGlitch > 0 && !window.isInteractionPaused)
    {
        const shakeX = (Math.random() - 0.5) * 30 * globalGlitch;
        const shakeY = (Math.random() - 0.5) * 30 * globalGlitch;
        ctx.translate(shakeX, shakeY);
    }

    for (let i = 0; i < particles.length; i++)
    {
        particles[i].update();
        particles[i].draw();
    }

    ctx.restore();

    requestAnimationFrame(animate); 
}

resize();
initParticles();
animate();