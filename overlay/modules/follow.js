/**
 * Follow Celebration Module
 *
 * Triggers epic confetti + fireworks when someone follows.
 *
 * Event: { type: 'follow', username: 'NewFollower123' }
 */

// Colors: Twitch purple theme + party vibes
const COLORS = [
  '#9146FF', '#FF6B9D', '#00FFFF', '#FFD700', '#FF4500',
  '#00FF7F', '#FF1493', '#7B68EE', '#FF0000', '#00FF00', '#FFFFFF',
];

// ============================================
// PARTICLE CLASSES
// ============================================

class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = -20;
    this.size = Math.random() * 18 + 10;
    this.speedY = Math.random() * 4 + 3;
    this.speedX = (Math.random() - 0.5) * 6;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 15;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.shape = ['rect', 'circle', 'triangle'][Math.floor(Math.random() * 3)];
    this.opacity = 1;
    this.gravity = 0.12;
    this.wobble = Math.random() * 10;
    this.wobbleSpeed = Math.random() * 0.15;
    this.trail = [];
  }

  update() {
    if (this.trail.length > 5) this.trail.shift();
    this.trail.push({ x: this.x, y: this.y, opacity: this.opacity * 0.3 });

    this.y += this.speedY;
    this.speedY += this.gravity;
    this.x += this.speedX + Math.sin(this.wobble) * 2;
    this.wobble += this.wobbleSpeed;
    this.rotation += this.rotationSpeed;
    this.speedX *= 0.99;

    if (this.y > this.canvas.height - 100) {
      this.opacity = Math.max(0, 1 - (this.y - (this.canvas.height - 100)) / 100);
    }

    return this.y < this.canvas.height + 50 && this.opacity > 0;
  }

  draw(ctx) {
    // Trail
    this.trail.forEach((t, i) => {
      ctx.save();
      ctx.globalAlpha = t.opacity * (i / this.trail.length) * 0.5;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.size / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;

    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -this.size / 2);
      ctx.lineTo(-this.size / 2, this.size / 2);
      ctx.lineTo(this.size / 2, this.size / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

class Firework {
  constructor(x, y) {
    this.particles = [];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const count = 40 + Math.floor(Math.random() * 30);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 2,
        size: 3 + Math.random() * 4,
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        color: Math.random() > 0.3 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  update() {
    let alive = false;
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.vx *= 0.98;
      p.life -= p.decay;
      if (p.life > 0) alive = true;
    });
    return alive;
  }

  draw(ctx) {
    this.particles.forEach(p => {
      if (p.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

class SpinningStar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 15 + 10;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.4;
    this.life = 1;
    this.decay = 0.012;
    this.points = Math.random() > 0.5 ? 5 : 6;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.rotation += this.rotationSpeed;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    for (let i = 0; i < this.points * 2; i++) {
      const radius = i % 2 === 0 ? this.size : this.size / 2;
      const angle = (i * Math.PI) / this.points;
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class Sparkle {
  constructor(canvas) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 4 + 2;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.02;
    this.twinkle = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 0.2 + Math.random() * 0.2;
  }

  update() {
    this.twinkle += this.twinkleSpeed;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life * (0.5 + Math.sin(this.twinkle) * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.size);
    ctx.lineTo(this.x + this.size * 0.3, this.y);
    ctx.lineTo(this.x, this.y + this.size);
    ctx.lineTo(this.x - this.size * 0.3, this.y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.x - this.size, this.y);
    ctx.lineTo(this.x, this.y + this.size * 0.3);
    ctx.lineTo(this.x + this.size, this.y);
    ctx.lineTo(this.x, this.y - this.size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class EmojiBurst {
  constructor(x, y) {
    this.emojis = ['🎉', '🎊', '🥳', '⭐', '✨', '💜', '🔥', '💫', '🌟'];
    this.emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 5;
    this.size = 30 + Math.random() * 20;
    this.rotation = (Math.random() - 0.5) * 0.5;
    this.rotationAngle = 0;
    this.life = 1;
    this.decay = 0.015;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2;
    this.vx *= 0.98;
    this.rotationAngle += this.rotation;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotationAngle);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

// ============================================
// MAIN FOLLOW EFFECT
// ============================================

export function trigger(canvas, ctx, textContainer, event) {
  const username = event.username || 'Someone';
  const particles = [];
  let isAnimating = true;

  // Update text
  const followerNameEl = textContainer.querySelector('.follower-name');
  if (followerNameEl) followerNameEl.textContent = username;

  // Screen shake
  document.body.classList.add('screen-shake');
  setTimeout(() => document.body.classList.remove('screen-shake'), 600);

  // Show text
  textContainer.classList.remove('hide');
  textContainer.classList.add('show');

  // Spawn particles
  function spawnConfetti(count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => particles.push(new Confetti(canvas)), i * 8);
    }
  }

  function spawnFireworks(count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        particles.push(new Firework(
          canvas.width * 0.2 + Math.random() * canvas.width * 0.6,
          canvas.height * 0.2 + Math.random() * canvas.height * 0.4
        ));
      }, i * 150);
    }
  }

  function spawnStars(count) {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        particles.push(new SpinningStar(
          cx + (Math.random() - 0.5) * 200,
          cy + (Math.random() - 0.5) * 200
        ));
      }, i * 50);
    }
  }

  function spawnSparkles(count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => particles.push(new Sparkle(canvas)), i * 30);
    }
  }

  function spawnEmojis(count) {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        particles.push(new EmojiBurst(
          cx + (Math.random() - 0.5) * 100,
          cy + (Math.random() - 0.5) * 100
        ));
      }, i * 80);
    }
  }

  // UNLEASH!
  spawnConfetti(350);
  spawnFireworks(10);
  spawnStars(25);
  spawnSparkles(60);
  spawnEmojis(20);

  setTimeout(() => spawnFireworks(5), 500);
  setTimeout(() => spawnFireworks(5), 1000);
  setTimeout(() => spawnStars(15), 800);

  // Animation loop
  function animate() {
    if (!isAnimating && particles.length === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const alive = particles[i].update();
      if (alive) {
        particles[i].draw(ctx);
      } else {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0 || isAnimating) {
      requestAnimationFrame(animate);
    }
  }

  animate();

  // Hide after delay
  setTimeout(() => {
    textContainer.classList.remove('show');
    textContainer.classList.add('hide');
    setTimeout(() => { isAnimating = false; }, 500);
  }, 5000);
}

export const html = `
  <div id="follow-celebration" class="effect-container">
    <div class="yay-text">YAAAAAY!</div>
    <div class="follower-name"></div>
    <div class="thanks-text">just followed! 🎉</div>
  </div>
`;

export const css = `
  #follow-celebration {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    text-align: center;
    opacity: 0;
    pointer-events: none;
    z-index: 100;
  }

  #follow-celebration.show {
    animation: popIn 0.5s ease-out forwards;
  }

  #follow-celebration.hide {
    animation: popOut 0.5s ease-in forwards;
  }

  #follow-celebration .yay-text {
    font-size: 90px;
    font-weight: 900;
    background: linear-gradient(90deg, #ff0000, #ff7700, #ffdd00, #00ff00, #00ffff, #0077ff, #ff00ff, #ff0000);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: rainbow 1s linear infinite, pulse 0.5s ease-in-out infinite alternate;
    filter: drop-shadow(0 0 20px rgba(255,255,255,0.8)) drop-shadow(0 0 40px rgba(145,70,255,0.8));
    margin-bottom: 20px;
    letter-spacing: 4px;
  }

  #follow-celebration .follower-name {
    font-size: 56px;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #00ffff, 3px 3px 0 #9146ff;
    animation: glow 1s ease-in-out infinite alternate;
  }

  #follow-celebration .thanks-text {
    font-size: 32px;
    color: #fff;
    margin-top: 15px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(145,70,255,0.8);
    animation: float 2s ease-in-out infinite;
  }
`;
