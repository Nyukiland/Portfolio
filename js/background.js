// ==========================================
// MOTEUR DE PARTICULES - MULTI-LAYERS & ADDITIVE GLOW
// ==========================================
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

let width, height;
const mouse = { x: -1000, y: -1000, isActive: false };
const CONNECTION_RANGE = 280;
const FORK_RANGE = 150; 

// --- DPI Scaling & Resize ---
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
}

window.addEventListener('resize', resize);
resize();

// --- Inputs Universels ---
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

window.addEventListener('mousedown', (e) =>
{
    if (e.target.tagName !== 'A' && e.target.tagName !== 'VIDEO') 
    {
        createShockwave(e.clientX, e.clientY);
    }
});

window.addEventListener('touchstart', (e) => 
{
    if (e.touches.length > 0 && e.target.tagName !== 'A' && e.target.tagName !== 'VIDEO') 
    {
        createShockwave(e.touches[0].clientX, e.touches[0].clientY);
    }
});

// --- Classes ---

class Particle
{
    constructor(id, layerZ)
    {
        this.id = id;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        
        this.z = layerZ; // De très proche de 0 (fond) à 1.0 (premier plan)
        
        this.baseRadius = 60 + (Math.random() * 40); 
        this.targetRadius = this.baseRadius * this.z;
        this.currentRadius = this.targetRadius;
        
        this.vx = (Math.random() - 0.5) * 0.8 * this.z;
        this.vy = (Math.random() - 0.5) * 0.8 * this.z;

        this.isConnected = false;
        this.isStunned = false;
        this.stunTimer = 0;
        
        // Matière assombrie : de presque noir pur (2) à gris très sombre (25)
        const shade = Math.floor(2 + 23 * this.z); 
        this.baseColor = `rgb(${shade}, ${shade}, ${shade})`;
    }

    update()
    {
        if (this.isStunned)
        {
            this.stunTimer--;
            if (this.stunTimer <= 0)
            {
                this.isStunned = false;
            }
        }
        else
        {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < -this.baseRadius) this.x = width + this.baseRadius;
            if (this.x > width + this.baseRadius) this.x = -this.baseRadius;
            if (this.y < -this.baseRadius) this.y = height + this.baseRadius;
            if (this.y > height + this.baseRadius) this.y = -this.baseRadius;
        }

        if (this.isStunned)
        {
            this.targetRadius = (this.baseRadius * this.z) * 0.1;
        }
        else if (this.isConnected)
        {
            this.targetRadius = (this.baseRadius * this.z) * 0.25;
        }
        else
        {
            this.targetRadius = this.baseRadius * this.z; 
        }

        this.currentRadius += (this.targetRadius - this.currentRadius) * 0.15;
    }

    // Pass 1 : Rendu de la matière inactive (Sans contour)
    drawDarkMatter()
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = this.baseColor;
        ctx.fill();
    }

    // Pass 2 : Rendu de l'énergie (Glow puissant)
    drawEnergy()
    {
        const alpha = this.isStunned ? 1.0 : 0.7;
        
        // Coeur de la particule
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.1, this.currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 204, ${alpha * this.z})`; 
        ctx.fill();
        
        // Halo additif volumineux
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, ${alpha * 0.15})`;
        ctx.fill();

        // Centre ultra-lumineux
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }

    stun(duration)
    {
        this.isStunned = true;
        this.stunTimer = duration;
    }
}

class ElectricalArc
{
    constructor(startX, startY, endX, endY, intensity, layerZ)
    {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.intensity = intensity; 
        this.z = layerZ;
    }

    draw()
    {
        const segmentCount = 8;
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        
        // Ligne principale cyan
        ctx.strokeStyle = `rgba(0, 255, 204, ${this.intensity})`;
        ctx.lineWidth = 2.5 * this.z * this.intensity;
        
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);

        for (let i = 1; i <= segmentCount; i++)
        {
            const t = i / segmentCount;
            const midX = this.startX + dx * t;
            const midY = this.startY + dy * t;
            const offset = (Math.random() - 0.5) * 40 * (1 - this.z); 
            
            ctx.lineTo(midX + offset, midY + offset);
        }
        ctx.stroke();

        // Core blanc à l'intérieur de l'éclair
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.intensity * 0.8})`;
        ctx.lineWidth = 1.0 * this.z * this.intensity;
        ctx.stroke();
    }
}

class Shockwave
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
        this.currentRadius = 0;
        this.speed = 18;
        this.life = 40; 
        this.alive = true;
    }

    update()
    {
        this.currentRadius += this.speed;
        this.life--;
        if (this.life <= 0)
        {
            this.alive = false;
        }

        const rangeSq = this.currentRadius * this.currentRadius;
        for (let i = 0; i < particles.length; i++)
        {
            const p = particles[i];
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < rangeSq && distSq > rangeSq - (this.speed * this.speed * 4))
            {
                p.stun(45); 
            }
        }
    }

    draw()
    {
        const alpha = Math.max(0, this.life / 40);
        
        // Onde de choc (Glow fort)
        ctx.strokeStyle = `rgba(0, 255, 204, ${alpha})`;
        ctx.lineWidth = 8 * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2 * alpha;
        ctx.stroke();
    }
}

// --- Initialisation : 6 Layers de Profondeur ---
const particles = [];
const arcs = [];
const shockwaves = [];

// 450 Particules réparties sur 6 couches. Les couches profondes sont plus denses.
const layerCounts = [140, 110, 80, 60, 40, 20]; 
layerCounts.forEach((count, index) =>
{
    // Espace de profondeur non-linéaire pour accentuer l'effet de gouffre
    const layerZ = Math.pow((index + 1) / layerCounts.length, 1.5); 
    for (let i = 0; i < count; i++)
    {
        particles.push(new Particle(particles.length, layerZ));
    }
});

particles.sort((a, b) => a.z - b.z);

function createShockwave(x, y)
{
    shockwaves.push(new Shockwave(x, y));
}

// --- Boucle Principale (Render Pipeline) ---
function animate()
{
    // Fond très sombre
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#020203'; 
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => p.isConnected = false);
    arcs.length = 0;

    // --- Update Logique ---
    for (let i = 0; i < particles.length; i++)
    {
        const p = particles[i];

        if (mouse.isActive && !p.isStunned)
        {
            const dxM = mouse.x - p.x;
            const dyM = mouse.y - p.y;
            const distSqM = dxM * dxM + dyM * dyM;

            if (distSqM < CONNECTION_RANGE * CONNECTION_RANGE)
            {
                p.isConnected = true;
                const distanceRatio = Math.sqrt(distSqM) / CONNECTION_RANGE;
                arcs.push(new ElectricalArc(mouse.x, mouse.y, p.x, p.y, (1 - distanceRatio), p.z));

                for (let j = i + 1; j < particles.length; j++)
                {
                    const other = particles[j];
                    if (other.isStunned || other.isConnected) continue;

                    const dxP = p.x - other.x;
                    const dyP = p.y - other.y;
                    const distSqP = dxP * dxP + dyP * dyP;

                    if (distSqP < FORK_RANGE * FORK_RANGE)
                    {
                        other.isConnected = true; 
                        const intensityP = 1 - (Math.sqrt(distSqP) / FORK_RANGE);
                        arcs.push(new ElectricalArc(p.x, p.y, other.x, other.y, intensityP * (1 - distanceRatio), other.z));
                    }
                }
            }
        }
        
        p.update();
    }

    for (let i = shockwaves.length - 1; i >= 0; i--)
    {
        const sw = shockwaves[i];
        sw.update();
        if (!sw.alive) shockwaves.splice(i, 1);
    }

    // --- Render Pass 1 : Matière Sombre Inactive ---
    for (let p of particles)
    {
        if (!p.isConnected && !p.isStunned)
        {
            p.drawDarkMatter();
        }
    }

    // --- Render Pass 2 : Énergie (Additive Blending) ---
    ctx.globalCompositeOperation = 'lighter';
    
    // On dessine l'énergie par-dessus la matière (Z-Buffer respecté grâce au tri initial)
    for (let p of particles)
    {
        if (p.isConnected || p.isStunned)
        {
            p.drawEnergy();
        }
    }

    arcs.forEach(arc => arc.draw());
    shockwaves.forEach(sw => sw.draw());

    requestAnimationFrame(animate); 
}

animate();