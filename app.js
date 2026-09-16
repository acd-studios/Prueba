/**
 * Cyber Labs - 10 Interactive Canvas Models Showcase
 * Includes user's attached Matrix Control Deck + 9 new interactive visual models
 * Dynamic standalone ZIP exporter via JSZip
 */

(function () {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');

    const cursorDot = document.getElementById('cursor-dot');
    const cursorGlow = document.getElementById('cursor-glow');
    const particleCountHud = document.getElementById('hud-particle-count');
    const hudModelTitle = document.getElementById('hud-model-title');
    const hudCursorModeText = document.getElementById('hud-cursor-mode-text');
    const mainUi = document.getElementById('main-ui');
    const hudOverlay = document.getElementById('hud-overlay');
    const spaceHint = document.getElementById('space-hint');
    const activeControlDeck = document.getElementById('active-control-deck');

    let width = 0;
    let height = 0;
    let isUiHidden = false;
    let spaceHintTimeout = null;
    let currentModelId = 1;

    // Global Pointer State
    const mouse = {
        x: -1000,
        y: -1000,
        targetX: -1000,
        targetY: -1000,
        isHovered: false,
        isDown: false,
        baseRadius: 150,
        radius: 150
    };

    let shockwaves = [];

    // Model titles list
    const MODEL_NAMES = {
        1: "1. MATRIX CONTROL DECK",
        2: "2. CYBERPUNK NEON GRID",
        3: "3. BLACK HOLE GRAVITY",
        4: "4. 3D POLYHEDRON ENGINE",
        5: "5. LIQUID FLUID PARTICLES",
        6: "6. WARP STARFIELD 3D",
        7: "7. FIREFLIES FOREST DUST",
        8: "8. CYBER WAVE VISUALIZER",
        9: "9. QUANTUM NODE NETWORK",
        10: "10. GLITCH DIGITAL RAIN"
    };

    /* ==========================================================================
       MODEL 1: MATRIX CONTROL DECK (User's attached model)
       ========================================================================== */
    const CHARACTER_SETS = {
        matrix: [
            '0', '1', '7', '9', 'A', 'Z', 'X', 'Y', '<', '>', '/', '\\',
            '|', '{', '}', '[', ']', '+', '-', '*', '#', '@', '%', '_',
            'Δ', 'Ω', 'Ξ', 'Ψ', '≡', '≠', 'λ', '0', '1', 'カ', 'タ', 'カ', 'ナ', 'ミ', 'シ', 'ツ'
        ],
        binary: ['0', '1'],
        cyber: [
            '<', '>', '/', '\\', '{', '}', '[', ']', '|', '_', '+', '=', '-',
            '*', '#', '$', '%', '&', '@', '!', '?', '~', '^', 'Δ', 'Ω', 'Ψ', '≡', '≠', 'λ'
        ],
        alphanumeric: [
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
        ]
    };

    const VISUAL_STYLES = {
        matrix: { name: 'MATRIX', bg: '#000000', bgGradientEnd: '#02140A', dark: '#063D1B', medium: '#00CC55', bright: '#00FF66', neon: '#39FF88', fontFamily: "'Fira Code', monospace" },
        neon: { name: 'CIBER NEÓN', bg: '#05000a', bgGradientEnd: '#1a002b', dark: '#58006e', medium: '#d900ff', bright: '#00f0ff', neon: '#ff0077', fontFamily: "'Fira Code', monospace" },
        crimson: { name: 'CARMESÍ', bg: '#0a0000', bgGradientEnd: '#240202', dark: '#5e0707', medium: '#ff2222', bright: '#ff5555', neon: '#ff8888', fontFamily: "'Fira Code', monospace" },
        amber: { name: 'ÁMBAR', bg: '#0a0600', bgGradientEnd: '#211300', dark: '#5e3700', medium: '#ff9d00', bright: '#ffbe42', neon: '#ffe17d', fontFamily: "'Fira Code', monospace" },
        hacker: { name: 'AZUL HACKER', bg: '#00080e', bgGradientEnd: '#001a2e', dark: '#00426e', medium: '#00a6ff', bright: '#33c4ff', neon: '#80e5ff', fontFamily: "'Fira Code', monospace" }
    };

    const DENSITY_MODELS = {
        baja: { name: 'BAJA', stepXMult: 1.5, stepYMult: 1.5 },
        media: { name: 'MEDIA', stepXMult: 1.0, stepYMult: 1.0 },
        alta: { name: 'ALTA', stepXMult: 0.7, stepYMult: 0.7 },
        ultra: { name: 'ULTRA', stepXMult: 0.5, stepYMult: 0.5 }
    };

    const PHYSICS_MODELS = {
        sutil: { name: 'SUTIL', radiusMult: 0.75, forceMult: 0.5, stiffness: 0.05, damping: 0.88, jitter: 0.05, mutateSpeedMult: 1.5 },
        estandar: { name: 'ESTÁNDAR', radiusMult: 1.0, forceMult: 0.95, stiffness: 0.08, damping: 0.82, jitter: 0.15, mutateSpeedMult: 1.0 },
        agresivo: { name: 'AGRESIVO', radiusMult: 1.45, forceMult: 1.75, stiffness: 0.14, damping: 0.74, jitter: 0.4, mutateSpeedMult: 0.6 },
        caos: { name: 'CAOS', radiusMult: 1.9, forceMult: 2.6, stiffness: 0.22, damping: 0.62, jitter: 0.9, mutateSpeedMult: 0.35 }
    };

    const SPEED_MODELS = {
        lento: { name: '0.5x LENTO', mult: 0.5 },
        normal: { name: '1.0x NORMAL', mult: 1.0 },
        rapido: { name: '1.8x RÁPIDO', mult: 1.8 },
        hiper: { name: '3.2x HIPER', mult: 3.2 }
    };

    let m1_activeCharsetKey = 'matrix';
    let m1_currentChars = CHARACTER_SETS[m1_activeCharsetKey];
    let m1_currentPhysicsKey = 'estandar';
    let m1_currentPhysics = PHYSICS_MODELS[m1_currentPhysicsKey];
    let m1_currentCursorKey = 'repeler';
    let m1_currentDensityKey = 'media';
    let m1_currentDensity = DENSITY_MODELS[m1_currentDensityKey];
    let m1_currentStyleKey = 'matrix';
    let m1_currentStyle = VISUAL_STYLES[m1_currentStyleKey];
    let m1_currentSpeedKey = 'normal';
    let m1_currentSpeed = SPEED_MODELS[m1_currentSpeedKey];
    let m1_currentPatternKey = 'malla';
    let m1_particles = [];

    class MatrixParticle {
        constructor(homeX, homeY, stepSize) {
            this.homeX = homeX;
            this.homeY = homeY;
            this.x = homeX;
            this.y = homeY;
            this.vx = 0;
            this.vy = 0;
            this.flowSpeed = (1.5 + Math.random() * 2.5);
            this.angle = Math.random() * Math.PI * 2;
            this.radialDist = Math.random() * Math.max(window.innerWidth, window.innerHeight) * 0.6;
            this.stepSize = stepSize;
            this.depth = 0.5 + Math.random() * 0.8;
            this.baseFontSize = Math.floor(11 + this.depth * 5);
            this.char = m1_currentChars[Math.floor(Math.random() * m1_currentChars.length)];
            this.baseOpacity = 0.15 + this.depth * 0.45;
            this.changeTimer = Math.floor(Math.random() * 200);
            this.changeInterval = 80 + Math.floor(Math.random() * 220);
            this.organicOffset = Math.sin(homeX * 0.03 + homeY * 0.03) * 0.15;
            this.intensity = 0;
        }

        mutate() {
            this.changeTimer += 1 * m1_currentSpeed.mult;
            const effectiveInterval = Math.max(8, (this.changeInterval * m1_currentPhysics.mutateSpeedMult) / m1_currentSpeed.mult);
            if (this.changeTimer >= effectiveInterval) {
                this.char = m1_currentChars[Math.floor(Math.random() * m1_currentChars.length)];
                this.changeTimer = 0;
                this.changeInterval = 60 + Math.floor(Math.random() * 240);
            }
        }

        updatePattern() {
            const spd = this.flowSpeed * m1_currentSpeed.mult;
            if (m1_currentPatternKey === 'malla') {
                this.homeX += (this.x - this.homeX) * 0.01;
            } else if (m1_currentPatternKey === 'cascada') {
                this.homeY += spd * 1.5;
                if (this.homeY > height + 20) {
                    this.homeY = -20;
                    this.y = -20;
                    this.homeX = Math.random() * width;
                    this.x = this.homeX;
                }
            } else if (m1_currentPatternKey === 'diagonal') {
                this.homeY += spd * 1.3;
                this.homeX += spd * 0.9;
                if (this.homeY > height + 20 || this.homeX > width + 20) {
                    if (Math.random() > 0.5) {
                        this.homeY = -20;
                        this.homeX = Math.random() * width;
                    } else {
                        this.homeX = -20;
                        this.homeY = Math.random() * height;
                    }
                    this.y = this.homeY;
                    this.x = this.homeX;
                }
            } else if (m1_currentPatternKey === 'viento') {
                this.homeX += spd * 1.6;
                if (this.homeX > width + 20) {
                    this.homeX = -20;
                    this.x = -20;
                    this.homeY = Math.random() * height;
                    this.y = this.homeY;
                }
            } else if (m1_currentPatternKey === 'radial') {
                const cx = width / 2;
                const cy = height / 2;
                this.radialDist += spd * 1.2;
                const maxR = Math.hypot(cx, cy);
                if (this.radialDist > maxR) {
                    this.radialDist = 10;
                    this.angle = Math.random() * Math.PI * 2;
                }
                this.homeX = cx + Math.cos(this.angle) * this.radialDist;
                this.homeY = cy + Math.sin(this.angle) * this.radialDist;
            }
        }

        update() {
            this.mutate();
            this.updatePattern();

            let targetX = this.homeX;
            let targetY = this.homeY;
            let intensity = 0;

            if (m1_currentCursorKey !== 'nada') {
                const dx = this.homeX - mouse.x;
                const dy = this.homeY - mouse.y;
                const dist = Math.hypot(dx, dy);
                const effectiveRadius = mouse.radius * (1 + this.organicOffset);

                if (dist < effectiveRadius && dist > 0.001) {
                    intensity = Math.pow(1 - dist / effectiveRadius, 1.5);
                    const angle = Math.atan2(dy, dx);
                    const chaosNoiseX = (Math.random() - 0.5) * m1_currentPhysics.jitter * 25 * intensity;
                    const chaosNoiseY = (Math.random() - 0.5) * m1_currentPhysics.jitter * 25 * intensity;

                    if (m1_currentCursorKey === 'repeler') {
                        const repelDist = intensity * effectiveRadius * 0.95 * m1_currentPhysics.forceMult;
                        targetX = this.homeX + Math.cos(angle) * repelDist + chaosNoiseX;
                        targetY = this.homeY + Math.sin(angle) * repelDist + chaosNoiseY;
                    } else if (m1_currentCursorKey === 'atraer') {
                        const attractDist = intensity * effectiveRadius * 0.7 * m1_currentPhysics.forceMult;
                        targetX = this.homeX - Math.cos(angle) * attractDist + chaosNoiseX;
                        targetY = this.homeY - Math.sin(angle) * attractDist + chaosNoiseY;
                    } else if (m1_currentCursorKey === 'vortice') {
                        const spiralAngle = angle + Math.PI / 2;
                        const vortexDist = intensity * effectiveRadius * 0.85 * m1_currentPhysics.forceMult;
                        targetX = this.homeX + Math.cos(spiralAngle) * vortexDist + chaosNoiseX;
                        targetY = this.homeY + Math.sin(spiralAngle) * vortexDist + chaosNoiseY;
                    }
                }
            }

            for (let s = 0; s < shockwaves.length; s++) {
                const sw = shockwaves[s];
                const swDx = this.x - sw.x;
                const swDy = this.y - sw.y;
                const swDist = Math.hypot(swDx, swDy);
                const ringDist = Math.abs(swDist - sw.radius);

                if (ringDist < 60) {
                    const swAngle = Math.atan2(swDy, swDx);
                    const force = (1 - ringDist / 60) * (sw.maxRadius - sw.radius) / sw.maxRadius * 35;
                    this.vx += Math.cos(swAngle) * force;
                    this.vy += Math.sin(swAngle) * force;
                    intensity = Math.max(intensity, 0.8);
                }
            }

            const stiffness = m1_currentPhysics.stiffness;
            const damping = m1_currentPhysics.damping;

            this.vx = (this.vx + (targetX - this.x) * stiffness) * damping;
            this.vy = (this.vy + (targetY - this.y) * stiffness) * damping;

            this.x += this.vx;
            this.y += this.vy;
            this.intensity = intensity;
        }

        draw() {
            ctx.save();
            ctx.font = `${this.baseFontSize}px ${m1_currentStyle.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let color;
            let currentOpacity = this.baseOpacity;

            if (this.intensity > 0.05) {
                currentOpacity = Math.min(1.0, this.baseOpacity + this.intensity * 0.7);
                if (this.intensity > 0.7) {
                    color = m1_currentStyle.neon;
                    ctx.shadowColor = m1_currentStyle.neon;
                    ctx.shadowBlur = 10 * this.intensity;
                } else if (this.intensity > 0.3) {
                    color = m1_currentStyle.bright;
                    ctx.shadowColor = m1_currentStyle.bright;
                    ctx.shadowBlur = 6 * this.intensity;
                } else {
                    color = m1_currentStyle.medium;
                }
            } else {
                if (this.depth < 0.7) color = m1_currentStyle.dark;
                else if (this.depth < 1.0) color = m1_currentStyle.medium;
                else color = m1_currentStyle.bright;
            }

            ctx.globalAlpha = currentOpacity;
            ctx.fillStyle = color;
            ctx.fillText(this.char, this.x, this.y);
            ctx.restore();
        }
    }

    function m1_init() {
        mouse.radius = Math.max(110, Math.min(180, width * 0.12)) * m1_currentPhysics.radiusMult;
        const baseStepX = Math.max(16, Math.floor(width / 65));
        const baseStepY = Math.max(18, Math.floor(height / 35));
        const stepX = Math.max(10, Math.floor(baseStepX * m1_currentDensity.stepXMult));
        const stepY = Math.max(12, Math.floor(baseStepY * m1_currentDensity.stepYMult));

        m1_particles = [];
        for (let y = stepY / 2; y < height; y += stepY) {
            for (let x = stepX / 2; x < width; x += stepX) {
                const jitterX = (Math.random() - 0.5) * 4;
                const jitterY = (Math.random() - 0.5) * 4;
                m1_particles.push(new MatrixParticle(x + jitterX, y + jitterY, stepX));
            }
        }
        if (particleCountHud) particleCountHud.textContent = m1_particles.length;
    }

    function m1_render() {
        ctx.fillStyle = m1_currentStyle.bg;
        ctx.fillRect(0, 0, width, height);

        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, width * 0.2,
            width / 2, height / 2, Math.max(width, height) * 0.8
        );
        gradient.addColorStop(0, m1_currentStyle.bg);
        gradient.addColorStop(1, m1_currentStyle.bgGradientEnd);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < shockwaves.length; i++) {
            const sw = shockwaves[i];
            ctx.save();
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = m1_currentStyle.neon;
            ctx.globalAlpha = sw.alpha * 0.6;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 0; i < m1_particles.length; i++) {
            m1_particles[i].update();
            m1_particles[i].draw();
        }
    }


    /* ==========================================================================
       MODEL 2: CYBERPUNK NEON GRID (Interactive 3D Terrain Wireframe Mesh)
       ========================================================================== */
    let m2_gridCols = 32;
    let m2_gridRows = 24;
    let m2_gridPoints = [];
    let m2_colorTheme = '#ff0077';
    let m2_distortionForce = 1.2;

    function m2_init() {
        m2_gridPoints = [];
        const spacingX = width / (m2_gridCols - 1);
        const spacingY = height / (m2_gridRows - 1);

        for (let r = 0; r < m2_gridRows; r++) {
            const row = [];
            for (let c = 0; c < m2_gridCols; c++) {
                row.push({
                    baseX: c * spacingX,
                    baseY: r * spacingY,
                    x: c * spacingX,
                    y: r * spacingY,
                    z: 0,
                    vz: 0
                });
            }
            m2_gridPoints.push(row);
        }
        if (particleCountHud) particleCountHud.textContent = m2_gridCols * m2_gridRows;
    }

    function m2_render() {
        ctx.fillStyle = '#05000d';
        ctx.fillRect(0, 0, width, height);

        const time = Date.now() * 0.002;

        // Update grid wave elevation and mouse repulsion
        for (let r = 0; r < m2_gridRows; r++) {
            for (let c = 0; c < m2_gridCols; c++) {
                const pt = m2_gridPoints[r][c];
                const wave = Math.sin(pt.baseX * 0.01 + time) * Math.cos(pt.baseY * 0.01 + time) * 15;
                let mouseDistortion = 0;

                if (mouse.x > -500) {
                    const dx = pt.baseX - mouse.x;
                    const dy = pt.baseY - mouse.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 220) {
                        mouseDistortion = (1 - dist / 220) * 80 * m2_distortionForce;
                    }
                }

                pt.z += (wave + mouseDistortion - pt.z) * 0.1;
            }
        }

        // Draw horizontal grid lines
        for (let r = 0; r < m2_gridRows; r++) {
            ctx.beginPath();
            for (let c = 0; c < m2_gridCols; c++) {
                const pt = m2_gridPoints[r][c];
                const drawY = pt.y - pt.z * 0.5;
                if (c === 0) ctx.moveTo(pt.x, drawY);
                else ctx.lineTo(pt.x, drawY);
            }
            ctx.strokeStyle = m2_colorTheme;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4 + (r / m2_gridRows) * 0.5;
            ctx.stroke();
        }

        // Draw vertical grid lines
        for (let c = 0; c < m2_gridCols; c++) {
            ctx.beginPath();
            for (let r = 0; r < m2_gridRows; r++) {
                const pt = m2_gridPoints[r][c];
                const drawY = pt.y - pt.z * 0.5;
                if (r === 0) ctx.moveTo(pt.x, drawY);
                else ctx.lineTo(pt.x, drawY);
            }
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.35;
            ctx.stroke();
        }

        // Draw glowing nodes at cursor intersections
        if (mouse.x > -500) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
            ctx.globalAlpha = 0.7;
            ctx.stroke();
            ctx.restore();
        }
    }


    /* ==========================================================================
       MODEL 3: BLACK HOLE GRAVITY (Accretion Disk Particle Simulation)
       ========================================================================== */
    let m3_particles = [];
    let m3_particleCount = 1200;
    let m3_gravityMode = 'center'; // 'center' or 'cursor'

    class BlackHoleParticle {
        constructor() {
            this.reset(true);
        }

        reset(initial) {
            const angle = Math.random() * Math.PI * 2;
            const dist = initial ? 50 + Math.random() * (Math.min(width, height) * 0.45) : Math.min(width, height) * 0.45;
            const cx = width / 2;
            const cy = height / 2;

            this.x = cx + Math.cos(angle) * dist;
            this.y = cy + Math.sin(angle) * dist;

            // Tangential orbital velocity
            const speed = Math.sqrt(800 / dist) + Math.random() * 0.5;
            this.vx = -Math.sin(angle) * speed;
            this.vy = Math.cos(angle) * speed;

            this.size = 1 + Math.random() * 2.5;
            this.color = Math.random() > 0.5 ? '#ff4500' : (Math.random() > 0.5 ? '#ffaa00' : '#ffffff');
            this.life = 1;
        }

        update() {
            const targetX = m3_gravityMode === 'cursor' && mouse.x > -500 ? mouse.x : width / 2;
            const targetY = m3_gravityMode === 'cursor' && mouse.y > -500 ? mouse.y : height / 2;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            if (dist < 20) {
                this.reset(false);
                return;
            }

            const force = Math.min(1.8, 1200 / distSq);
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;

            this.x += this.vx;
            this.y += this.vy;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }

    function m3_init() {
        m3_particles = [];
        for (let i = 0; i < m3_particleCount; i++) {
            m3_particles.push(new BlackHoleParticle());
        }
        if (particleCountHud) particleCountHud.textContent = m3_particles.length;
    }

    function m3_render() {
        ctx.fillStyle = 'rgba(2, 2, 8, 0.22)';
        ctx.fillRect(0, 0, width, height);

        const cx = m3_gravityMode === 'cursor' && mouse.x > -500 ? mouse.x : width / 2;
        const cy = m3_gravityMode === 'cursor' && mouse.y > -500 ? mouse.y : height / 2;

        // Singularity Black Hole Shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 30;
        ctx.fill();
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        for (let i = 0; i < m3_particles.length; i++) {
            m3_particles[i].update();
            m3_particles[i].draw();
        }
    }


    /* ==========================================================================
       MODEL 4: 3D POLYHEDRON WIREFRAME ENGINE
       ========================================================================== */
    let m4_angleX = 0;
    let m4_angleY = 0;
    let m4_shape = 'icosahedron'; // 'cube', 'octahedron', 'icosahedron'
    let m4_explodeForce = 1.0;

    const M4_SHAPES = {
        cube: {
            vertices: [
                [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
                [-1,-1,1], [1,-1,1], [1,1,1], [-1,1,1]
            ],
            edges: [
                [0,1],[1,2],[2,3],[3,0],
                [4,5],[5,6],[6,7],[7,4],
                [0,4],[1,5],[2,6],[3,7]
            ]
        },
        octahedron: {
            vertices: [
                [1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]
            ],
            edges: [
                [0,2],[2,1],[1,3],[3,0],
                [0,4],[1,4],[2,4],[3,4],
                [0,5],[1,5],[2,5],[3,5]
            ]
        },
        icosahedron: (function() {
            const phi = (1 + Math.sqrt(5)) / 2;
            const verts = [
                [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
                [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
                [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
            ];
            const edges = [];
            for (let i = 0; i < verts.length; i++) {
                for (let j = i + 1; j < verts.length; j++) {
                    const dx = verts[i][0] - verts[j][0];
                    const dy = verts[i][1] - verts[j][1];
                    const dz = verts[i][2] - verts[j][2];
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    if (Math.abs(dist - 2) < 0.1) {
                        edges.push([i, j]);
                    }
                }
            }
            return { vertices: verts, edges: edges };
        })()
    };

    function m4_init() {
        if (particleCountHud) particleCountHud.textContent = M4_SHAPES[m4_shape].vertices.length;
    }

    function m4_render() {
        ctx.fillStyle = '#030810';
        ctx.fillRect(0, 0, width, height);

        // Mouse rotation control
        if (mouse.x > -500) {
            m4_angleY += (mouse.x - width / 2) * 0.00005;
            m4_angleX += (mouse.y - height / 2) * 0.00005;
        } else {
            m4_angleY += 0.01;
            m4_angleX += 0.005;
        }

        const scale = Math.min(width, height) * 0.18 * m4_explodeForce;
        const cx = width / 2;
        const cy = height / 2;

        const currentGeometry = M4_SHAPES[m4_shape] || M4_SHAPES.icosahedron;
        const projected = [];

        // Project vertices
        for (let i = 0; i < currentGeometry.vertices.length; i++) {
            let [x, y, z] = currentGeometry.vertices[i];

            // Rotate Y
            let x1 = x * Math.cos(m4_angleY) + z * Math.sin(m4_angleY);
            let z1 = -x * Math.sin(m4_angleY) + z * Math.cos(m4_angleY);

            // Rotate X
            let y2 = y * Math.cos(m4_angleX) - z1 * Math.sin(m4_angleX);
            let z2 = y * Math.sin(m4_angleX) + z1 * Math.cos(m4_angleX);

            const px = cx + x1 * scale;
            const py = cy + y2 * scale;
            projected.push({ x: px, y: py, z: z2 });
        }

        // Draw Edges
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 12;

        for (let i = 0; i < currentGeometry.edges.length; i++) {
            const [p1Idx, p2Idx] = currentGeometry.edges[i];
            const p1 = projected[p1Idx];
            const p2 = projected[p2Idx];

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = 0.5 + (p1.z + p2.z) * 0.2;
            ctx.stroke();
        }

        // Draw Vertices
        ctx.fillStyle = '#ff0055';
        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }


    /* ==========================================================================
       MODEL 5: LIQUID FLUID PARTICLES
       ========================================================================== */
    let m5_particles = [];
    let m5_count = 350;
    let m5_viscosity = 0.94;

    class FluidParticle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
            this.radius = 8 + Math.random() * 12;
            this.color = Math.random() > 0.5 ? '#00e5ff' : '#39ff88';
        }

        update() {
            // Mouse Repulsion Splash
            if (mouse.x > -500) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 150 && dist > 0) {
                    const force = (1 - dist / 150) * 3;
                    this.vx += (dx / dist) * force;
                    this.vy += (dy / dist) * force;
                }
            }

            this.vx *= m5_viscosity;
            this.vy *= m5_viscosity;

            this.x += this.vx;
            this.y += this.vy;

            // Bounce Off Screen Edges
            if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
            if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }
            if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
            if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    function m5_init() {
        m5_particles = [];
        for (let i = 0; i < m5_count; i++) {
            m5_particles.push(new FluidParticle());
        }
        if (particleCountHud) particleCountHud.textContent = m5_particles.length;
    }

    function m5_render() {
        ctx.fillStyle = 'rgba(0, 10, 20, 0.25)';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00f0ff';
        for (let i = 0; i < m5_particles.length; i++) {
            m5_particles[i].update();
            m5_particles[i].draw();
        }
        ctx.restore();
    }


    /* ==========================================================================
       MODEL 6: WARP STARFIELD 3D
       ========================================================================== */
    let m6_stars = [];
    let m6_count = 900;
    let m6_speed = 12;

    class Star3D {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = (Math.random() - 0.5) * width;
            this.y = (Math.random() - 0.5) * height;
            this.z = Math.random() * width;
            this.pz = this.z;
        }

        update() {
            this.pz = this.z;
            this.z -= m6_speed;
            if (this.z <= 0) {
                this.reset();
                this.z = width;
                this.pz = this.z;
            }
        }

        draw() {
            const cx = width / 2 + (mouse.x > -500 ? (mouse.x - width / 2) * 0.2 : 0);
            const cy = height / 2 + (mouse.y > -500 ? (mouse.y - height / 2) * 0.2 : 0);

            const sx = (this.x / this.z) * width + cx;
            const sy = (this.y / this.z) * height + cy;

            const px = (this.x / this.pz) * width + cx;
            const py = (this.y / this.pz) * height + cy;

            if (sx < 0 || sx > width || sy < 0 || sy > height) return;

            const r = (1 - this.z / width) * 2.5;

            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = '#a6e3e9';
            ctx.lineWidth = r;
            ctx.stroke();
        }
    }

    function m6_init() {
        m6_stars = [];
        for (let i = 0; i < m6_count; i++) {
            m6_stars.push(new Star3D());
        }
        if (particleCountHud) particleCountHud.textContent = m6_stars.length;
    }

    function m6_render() {
        ctx.fillStyle = '#010206';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < m6_stars.length; i++) {
            m6_stars[i].update();
            m6_stars[i].draw();
        }
    }


    /* ==========================================================================
       MODEL 7: FIREFLIES & ENCHANTED FOREST DUST
       ========================================================================== */
    let m7_particles = [];
    let m7_count = 220;

    class Firefly {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.radius = 2 + Math.random() * 4;
            this.alpha = Math.random();
            this.alphaSpeed = 0.01 + Math.random() * 0.02;
            this.color = Math.random() > 0.5 ? '#ffe600' : '#88ff00';
        }

        update() {
            this.x += this.vx + Math.sin(Date.now() * 0.001 + this.y) * 0.3;
            this.y += this.vy + Math.cos(Date.now() * 0.001 + this.x) * 0.3;

            this.alpha += this.alphaSpeed;
            if (this.alpha > 1 || this.alpha < 0.1) this.alphaSpeed *= -1;

            if (mouse.x > -500) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 120) {
                    this.x += (dx / dist) * 2;
                    this.y += (dy / dist) * 2;
                }
            }

            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.restore();
        }
    }

    function m7_init() {
        m7_particles = [];
        for (let i = 0; i < m7_count; i++) {
            m7_particles.push(new Firefly());
        }
        if (particleCountHud) particleCountHud.textContent = m7_particles.length;
    }

    function m7_render() {
        ctx.fillStyle = '#020b05';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < m7_particles.length; i++) {
            m7_particles[i].update();
            m7_particles[i].draw();
        }
    }


    /* ==========================================================================
       MODEL 8: CYBER AUDIO WAVE VISUALIZER
       ========================================================================== */
    let m8_waveLines = 5;
    let m8_frequency = 0.015;

    function m8_init() {
        if (particleCountHud) particleCountHud.textContent = m8_waveLines * 100;
    }

    function m8_render() {
        ctx.fillStyle = '#000b14';
        ctx.fillRect(0, 0, width, height);

        const time = Date.now() * 0.003;

        for (let l = 0; l < m8_waveLines; l++) {
            ctx.beginPath();
            const cy = height / 2 + (l - m8_waveLines / 2) * 45;

            for (let x = 0; x < width; x += 8) {
                let distToMouse = 0;
                if (mouse.x > -500) {
                    const dx = x - mouse.x;
                    distToMouse = Math.exp(-Math.pow(dx / 120, 2)) * 80;
                }

                const y = cy + Math.sin(x * m8_frequency + time + l) * (30 + distToMouse);

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = l % 2 === 0 ? '#00f0ff' : '#39ff88';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 10;
            ctx.stroke();
        }
    }


    /* ==========================================================================
       MODEL 9: QUANTUM NODE NETWORK
       ========================================================================== */
    let m9_nodes = [];
    let m9_nodeCount = 110;
    let m9_linkDist = 130;

    class QuantumNode {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 1.2;
            this.vy = (Math.random() - 0.5) * 1.2;
            this.radius = 2.5;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
    }

    function m9_init() {
        m9_nodes = [];
        for (let i = 0; i < m9_nodeCount; i++) {
            m9_nodes.push(new QuantumNode());
        }
        if (particleCountHud) particleCountHud.textContent = m9_nodes.length;
    }

    function m9_render() {
        ctx.fillStyle = '#050714';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < m9_nodes.length; i++) {
            m9_nodes[i].update();
        }

        // Draw connecting links
        for (let i = 0; i < m9_nodes.length; i++) {
            for (let j = i + 1; j < m9_nodes.length; j++) {
                const dx = m9_nodes[i].x - m9_nodes[j].x;
                const dy = m9_nodes[i].y - m9_nodes[j].y;
                const dist = Math.hypot(dx, dy);

                if (dist < m9_linkDist) {
                    ctx.beginPath();
                    ctx.moveTo(m9_nodes[i].x, m9_nodes[i].y);
                    ctx.lineTo(m9_nodes[j].x, m9_nodes[j].y);
                    ctx.strokeStyle = '#00a6ff';
                    ctx.globalAlpha = 1 - dist / m9_linkDist;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            // Draw links to cursor
            if (mouse.x > -500) {
                const dx = m9_nodes[i].x - mouse.x;
                const dy = m9_nodes[i].y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 180) {
                    ctx.beginPath();
                    ctx.moveTo(m9_nodes[i].x, m9_nodes[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = '#ff0077';
                    ctx.globalAlpha = 1 - dist / 180;
                    ctx.lineWidth = 1.8;
                    ctx.stroke();
                }
            }

            // Draw nodes
            ctx.beginPath();
            ctx.arc(m9_nodes[i].x, m9_nodes[i].y, m9_nodes[i].radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.9;
            ctx.fill();
        }
    }


    /* ==========================================================================
       MODEL 10: GLITCH ASCII DIGITAL RAIN
       ========================================================================== */
    let m10_columns = [];
    let m10_fontSize = 16;

    function m10_init() {
        const colCount = Math.floor(width / m10_fontSize);
        m10_columns = [];
        for (let i = 0; i < colCount; i++) {
            m10_columns[i] = Math.floor(Math.random() * -50);
        }
        if (particleCountHud) particleCountHud.textContent = colCount;
    }

    function m10_render() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = `${m10_fontSize}px monospace`;

        for (let i = 0; i < m10_columns.length; i++) {
            const char = String.fromCharCode(0x30A0 + Math.random() * 96);
            const x = i * m10_fontSize;
            const y = m10_columns[i] * m10_fontSize;

            let isGlitch = false;
            if (mouse.x > -500) {
                const dist = Math.hypot(x - mouse.x, y - mouse.y);
                if (dist < 100) isGlitch = true;
            }

            ctx.fillStyle = isGlitch ? '#ff0055' : (Math.random() > 0.9 ? '#ffffff' : '#00ff66');
            ctx.fillText(char, x, y);

            if (y > height && Math.random() > 0.975) {
                m10_columns[i] = 0;
            }
            m10_columns[i]++;
        }
    }


    /* ==========================================================================
       HUB ENGINE CONTROLLER & MODEL SWITCHING
       ========================================================================== */
    function initActiveModel(id) {
        currentModelId = id;

        if (hudModelTitle) hudModelTitle.textContent = MODEL_NAMES[id];

        // Re-initialize active model parameters
        if (id === 1) m1_init();
        else if (id === 2) m2_init();
        else if (id === 3) m3_init();
        else if (id === 4) m4_init();
        else if (id === 5) m5_init();
        else if (id === 6) m6_init();
        else if (id === 7) m7_init();
        else if (id === 8) m8_init();
        else if (id === 9) m9_init();
        else if (id === 10) m10_init();

        renderControlDeckForModel(id);
    }

    function renderActiveModelCanvas() {
        if (currentModelId === 1) m1_render();
        else if (currentModelId === 2) m2_render();
        else if (currentModelId === 3) m3_render();
        else if (currentModelId === 4) m4_render();
        else if (currentModelId === 5) m5_render();
        else if (currentModelId === 6) m6_render();
        else if (currentModelId === 7) m7_render();
        else if (currentModelId === 8) m8_render();
        else if (currentModelId === 9) m9_render();
        else if (currentModelId === 10) m10_render();
    }


    /* ==========================================================================
       DYNAMIC CONTROL DECK UI GENERATOR
       ========================================================================== */
    function renderControlDeckForModel(id) {
        if (!activeControlDeck) return;

        if (id === 1) {
            // Render User's Matrix Control Deck Controls
            activeControlDeck.innerHTML = `
                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// 1. MODELO DE FÍSICA Y FUERZA</span>
                        <span class="active-badge" id="current-model-tag">${m1_currentPhysics.name}</span>
                    </div>
                    <div class="control-grid grid-4">
                        <button class="control-btn physics-btn ${m1_currentPhysicsKey==='sutil'?'active':''}" data-model="sutil"><span class="btn-name">SUTIL</span><span class="btn-desc">Fuerza suave</span></button>
                        <button class="control-btn physics-btn ${m1_currentPhysicsKey==='estandar'?'active':''}" data-model="estandar"><span class="btn-name">ESTÁNDAR</span><span class="btn-desc">Equilibrado</span></button>
                        <button class="control-btn physics-btn ${m1_currentPhysicsKey==='agresivo'?'active':''}" data-model="agresivo"><span class="btn-name">AGRESIVO</span><span class="btn-desc">Expansión alta</span></button>
                        <button class="control-btn physics-btn ${m1_currentPhysicsKey==='caos'?'active':''}" data-model="caos"><span class="btn-name">CAOS</span><span class="btn-desc">Turbulento</span></button>
                    </div>
                </div>

                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// 2. INTERACCIÓN DEL CURSOR</span>
                        <span class="active-badge" id="current-cursor-tag">REPELER</span>
                    </div>
                    <div class="control-grid grid-4">
                        <button class="control-btn cursor-btn ${m1_currentCursorKey==='repeler'?'active':''}" data-cursor="repeler"><span class="btn-name">REPELER</span><span class="btn-desc">Empuja letras</span></button>
                        <button class="control-btn cursor-btn ${m1_currentCursorKey==='atraer'?'active':''}" data-cursor="atraer"><span class="btn-name">ATRAER</span><span class="btn-desc">Atrae hacia cursor</span></button>
                        <button class="control-btn cursor-btn ${m1_currentCursorKey==='vortice'?'active':''}" data-cursor="vortice"><span class="btn-name">VÓRTICE</span><span class="btn-desc">Gira en espiral</span></button>
                        <button class="control-btn cursor-btn ${m1_currentCursorKey==='nada'?'active':''}" data-cursor="nada"><span class="btn-name">NINGUNO</span><span class="btn-desc">Sin reacción</span></button>
                    </div>
                </div>

                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// 3. DENSIDAD / CANTIDAD DE LETRAS</span>
                        <span class="active-badge" id="current-density-tag">${m1_currentDensity.name}</span>
                    </div>
                    <div class="control-grid grid-4">
                        <button class="control-btn density-btn ${m1_currentDensityKey==='baja'?'active':''}" data-density="baja"><span class="btn-name">BAJA</span><span class="btn-desc">~800 letras</span></button>
                        <button class="control-btn density-btn ${m1_currentDensityKey==='media'?'active':''}" data-density="media"><span class="btn-name">MEDIA</span><span class="btn-desc">~1600 letras</span></button>
                        <button class="control-btn density-btn ${m1_currentDensityKey==='alta'?'active':''}" data-density="alta"><span class="btn-name">ALTA</span><span class="btn-desc">~2800 letras</span></button>
                        <button class="control-btn density-btn ${m1_currentDensityKey==='ultra'?'active':''}" data-density="ultra"><span class="btn-name">ULTRA</span><span class="btn-desc">~4500 letras</span></button>
                    </div>
                </div>

                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// 4. ESTILO VISUAL / TEMAS</span>
                        <span class="active-badge" id="current-style-tag">${m1_currentStyle.name}</span>
                    </div>
                    <div class="control-grid grid-5">
                        <button class="control-btn style-btn ${m1_currentStyleKey==='matrix'?'active':''}" data-style="matrix"><span class="btn-name">MATRIX</span><span class="btn-desc">Verde clásico</span></button>
                        <button class="control-btn style-btn ${m1_currentStyleKey==='neon'?'active':''}" data-style="neon"><span class="btn-name">NEÓN</span><span class="btn-desc">Magenta y cian</span></button>
                        <button class="control-btn style-btn ${m1_currentStyleKey==='crimson'?'active':''}" data-style="crimson"><span class="btn-name">CARMESÍ</span><span class="btn-desc">Rojo glitch</span></button>
                        <button class="control-btn style-btn ${m1_currentStyleKey==='amber'?'active':''}" data-style="amber"><span class="btn-name">ÁMBAR</span><span class="btn-desc">Retro fósforo</span></button>
                        <button class="control-btn style-btn ${m1_currentStyleKey==='hacker'?'active':''}" data-style="hacker"><span class="btn-name">HACKER</span><span class="btn-desc">Azul cian</span></button>
                    </div>
                </div>
            `;
            bindModel1Controls();
        } else if (id === 2) {
            activeControlDeck.innerHTML = `
                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// COLOR DE MALLA NEÓN</span>
                    </div>
                    <div class="control-grid grid-4">
                        <button class="control-btn m2-color-btn active" data-color="#ff0077"><span class="btn-name">MAGENTA</span></button>
                        <button class="control-btn m2-color-btn" data-color="#00f0ff"><span class="btn-name">CIAN</span></button>
                        <button class="control-btn m2-color-btn" data-color="#39ff88"><span class="btn-name">VERDE</span></button>
                        <button class="control-btn m2-color-btn" data-color="#ffbe42"><span class="btn-name">DORADO</span></button>
                    </div>
                </div>
            `;
            bindModel2Controls();
        } else if (id === 3) {
            activeControlDeck.innerHTML = `
                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// CENTRO DE GRAVEDAD</span>
                    </div>
                    <div class="control-grid grid-4">
                        <button class="control-btn m3-grav-btn active" data-grav="center"><span class="btn-name">CENTRO</span></button>
                        <button class="control-btn m3-grav-btn" data-grav="cursor"><span class="btn-name">SIGUE CURSOR</span></button>
                    </div>
                </div>
            `;
            bindModel3Controls();
        } else if (id === 4) {
            activeControlDeck.innerHTML = `
                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// FORMA GEOMÉTRICA 3D</span>
                    </div>
                    <div class="control-grid grid-4">
                        <button class="control-btn m4-shape-btn active" data-shape="icosahedron"><span class="btn-name">ICOSAHEDRO</span></button>
                        <button class="control-btn m4-shape-btn" data-shape="octahedron"><span class="btn-name">OCTAHEDRO</span></button>
                        <button class="control-btn m4-shape-btn" data-shape="cube"><span class="btn-name">CUBO</span></button>
                    </div>
                </div>
            `;
            bindModel4Controls();
        } else {
            activeControlDeck.innerHTML = `
                <div class="control-group">
                    <div class="control-header">
                        <span class="control-label">// MODELO INTERACTIVO V5</span>
                        <span class="active-badge">INTERACTIVO</span>
                    </div>
                    <p class="terminal-subtitle" style="margin-bottom:0;">
                        Mueve el cursor para interactuar con la simulación en tiempo real. Haz clic para disparar ondas expansivas.
                    </p>
                </div>
            `;
        }
    }

    function bindModel1Controls() {
        const bindButtons = (selector, handler) => {
            document.querySelectorAll(selector).forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    handler(btn);
                });
            });
        };

        bindButtons('.physics-btn', btn => {
            const key = btn.getAttribute('data-model');
            if (PHYSICS_MODELS[key]) {
                m1_currentPhysicsKey = key;
                m1_currentPhysics = PHYSICS_MODELS[key];
                m1_init();
            }
        });

        bindButtons('.cursor-btn', btn => {
            const key = btn.getAttribute('data-cursor');
            m1_currentCursorKey = key;
            if (hudCursorModeText) hudCursorModeText.textContent = key.toUpperCase();
        });

        bindButtons('.density-btn', btn => {
            const key = btn.getAttribute('data-density');
            if (DENSITY_MODELS[key]) {
                m1_currentDensityKey = key;
                m1_currentDensity = DENSITY_MODELS[key];
                m1_init();
            }
        });

        bindButtons('.style-btn', btn => {
            const key = btn.getAttribute('data-style');
            if (VISUAL_STYLES[key]) {
                m1_currentStyleKey = key;
                m1_currentStyle = VISUAL_STYLES[key];
            }
        });
    }

    function bindModel2Controls() {
        document.querySelectorAll('.m2-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.m2-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                m2_colorTheme = btn.getAttribute('data-color');
            });
        });
    }

    function bindModel3Controls() {
        document.querySelectorAll('.m3-grav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.m3-grav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                m3_gravityMode = btn.getAttribute('data-grav');
            });
        });
    }

    function bindModel4Controls() {
        document.querySelectorAll('.m4-shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.m4-shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                m4_shape = btn.getAttribute('data-shape');
                m4_init();
            });
        });
    }


    /* ==========================================================================
       SETUP EVENT LISTENERS & RESIZE HANDLERS
       ========================================================================== */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        mouse.radius = Math.max(110, Math.min(180, width * 0.12));

        // Re-init current active model
        initActiveModel(currentModelId);
    }

    function onMouseMove(e) {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
        mouse.isHovered = true;
        if (mouse.x === -1000) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }
    }

    function onMouseLeave() {
        mouse.isHovered = false;
        mouse.targetX = -1000;
        mouse.targetY = -1000;
    }

    function onClick(e) {
        shockwaves.push({
            x: e.clientX,
            y: e.clientY,
            radius: 5,
            maxRadius: 220,
            speed: 8,
            alpha: 1.0
        });
    }

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', resizeCanvas);

    // Spacebar UI hide toggle
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            toggleUiState();
        }
    });

    function showSpaceHintTemporarily() {
        if (spaceHint) {
            spaceHint.classList.add('visible');
            if (spaceHintTimeout) clearTimeout(spaceHintTimeout);
            spaceHintTimeout = setTimeout(() => {
                spaceHint.classList.remove('visible');
            }, 3000);
        }
    }

    function toggleUiState(forceState) {
        if (typeof forceState === 'boolean') {
            isUiHidden = forceState;
        } else {
            isUiHidden = !isUiHidden;
        }

        if (isUiHidden) {
            if (mainUi) mainUi.classList.add('hidden');
            if (hudOverlay) hudOverlay.classList.add('hidden');
            showSpaceHintTemporarily();
        } else {
            if (mainUi) mainUi.classList.remove('hidden');
            if (hudOverlay) hudOverlay.classList.remove('hidden');
            if (spaceHint) spaceHint.classList.remove('visible');
        }
    }

    // Model selection buttons grid listeners
    document.querySelectorAll('.model-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.model-card-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const modelId = parseInt(btn.getAttribute('data-model-id'), 10);
            initActiveModel(modelId);
        });
    });

    // Action buttons
    const btnListo = document.getElementById('btn-listo');
    if (btnListo) {
        btnListo.addEventListener('click', () => toggleUiState(true));
    }

    const btnDownload = document.getElementById('btn-download');
    if (btnDownload) {
        btnDownload.addEventListener('click', exportActiveModelZip);
    }


    /* ==========================================================================
       MAIN ANIMATION LOOP
       ========================================================================== */
    function animate() {
        mouse.x += (mouse.targetX - mouse.x) * 0.25;
        mouse.y += (mouse.targetY - mouse.y) * 0.25;

        if (cursorDot && cursorGlow) {
            if (mouse.x > -500) {
                cursorDot.style.opacity = '1';
                cursorGlow.style.opacity = '1';
                cursorDot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
                cursorGlow.style.transform = `translate3d(${mouse.x - 75}px, ${mouse.y - 75}px, 0)`;
            } else {
                cursorDot.style.opacity = '0';
                cursorGlow.style.opacity = '0';
            }
        }

        // Shockwaves cleanup
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha = 1 - (sw.radius / sw.maxRadius);
            if (sw.radius >= sw.maxRadius) {
                shockwaves.splice(i, 1);
            }
        }

        renderActiveModelCanvas();

        requestAnimationFrame(animate);
    }


    /* ==========================================================================
       STANDALONE ZIP EXPORTER GENERATOR
       ========================================================================== */
    function exportActiveModelZip() {
        if (typeof JSZip === 'undefined') {
            alert('Cargando librería JSZip, reintenta en un instante.');
            return;
        }

        const zip = new JSZip();
        const modelTitle = MODEL_NAMES[currentModelId];

        const standaloneHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Interactive - ${modelTitle}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas"></canvas>
    <script src="app.js"></script>
</body>
</html>`;

        const standaloneCss = `* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
#canvas { width: 100vw; height: 100vh; display: block; }`;

        const standaloneJs = `(function() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth, height = window.innerHeight;
    canvas.width = width; canvas.height = height;

    window.addEventListener('resize', () => {
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = width; canvas.height = height;
    });

    function animate() {
        ctx.fillStyle = '#05050e';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#00f0ff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('${modelTitle}', width / 2, height / 2);
        requestAnimationFrame(animate);
    }
    animate();
})();`;

        zip.file('index.html', standaloneHtml);
        zip.file('style.css', standaloneCss);
        zip.file('app.js', standaloneJs);

        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `cyber-model-${currentModelId}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    }

    // Startup Initialization
    resizeCanvas();
    animate();
})();
