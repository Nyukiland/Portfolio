const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); 

let width, height;
const mouse = { x: -1000, y: -1000, isActive: false };

const CONNECTION_RANGE = 180; 
const FORK_RANGE = 90; 
const DEFORMATION_RANGE = 350;

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
        
        this.vx = (Math.random() - 0.5) * 0.8 * this.z;
        this.vy = (Math.random() - 0.5) * 0.8 * this.z;

        this.isConnected = false;
        this.isStunned = false;
        this.stunTimer = 0;
        
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

        let distFactor = 1.0;

        if (mouse.isActive && !this.isStunned)
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

        if (this.isStunned)
        {
            this.targetRadius = (this.baseRadius * this.depthScale) * 0.08;
        }
        else
        {
            this.targetRadius = (this.baseRadius * this.depthScale) * distFactor; 
        }

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
        
        ctx.strokeStyle = `rgba(0, 200, 255, ${this.intensity * 0.8})`; 
        ctx.lineWidth = 1.5 * this.z * this.intensity;
        
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);

        for (let i = 1; i <= segmentCount; i++)
        {
            const t = i / segmentCount;
            const midX = this.startX + dx * t;
            const midY = this.startY + dy * t;
            const offset = (Math.random() - 0.5) * 30 * (1 - this.z); 
            
            ctx.lineTo(midX + offset, midY + offset);
        }
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
        this.speed = 22; 
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
        
        ctx.strokeStyle = `rgba(0, 200, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

const particles = [];
const arcs = [];
const shockwaves = [];

const layerCounts = [200, 100, 60, 40, 25, 10]; 
layerCounts.forEach((count, index) =>
{
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

function animate()
{
    ctx.fillStyle = '#030001'; 
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => p.isConnected = false);
    arcs.length = 0;

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
        p.draw();
    }

    for (let i = shockwaves.length - 1; i >= 0; i--)
    {
        const sw = shockwaves[i];
        sw.update();
        if (sw.alive)
        {
            sw.draw();
        }
        else
        {
            shockwaves.splice(i, 1);
        }
    }

    arcs.forEach(arc => arc.draw());

    requestAnimationFrame(animate); 
}

animate();