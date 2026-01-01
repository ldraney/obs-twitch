/**
 * Subscribe Alert Module
 *
 * Hearts and love when someone subscribes!
 *
 * Event: { type: 'subscribe', username: 'SubName', months: 1, tier: '1000' }
 */

const HEART_COLORS = ['#FF1493', '#FF69B4', '#9146FF', '#FFD700', '#FF6B9D'];

class Heart {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 50;
    this.size = Math.random() * 30 + 20;
    this.speedY = -(Math.random() * 3 + 2);
    this.speedX = (Math.random() - 0.5) * 2;
    this.rotation = (Math.random() - 0.5) * 0.1;
    this.rotationAngle = Math.random() * Math.PI * 2;
    this.color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    this.opacity = 1;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.05 + Math.random() * 0.05;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.wobble) * 1;
    this.wobble += this.wobbleSpeed;
    this.rotationAngle += this.rotation;

    if (this.y < -50) {
      this.opacity -= 0.05;
    }

    return this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotationAngle);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;

    // Draw heart shape
    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.3, 0, s);
    ctx.bezierCurveTo(s, s * 0.3, s * 0.5, -s * 0.3, 0, s * 0.3);
    ctx.fill();

    ctx.restore();
  }
}

class Sparkle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 4;
    this.life = 1;
    this.decay = 0.03 + Math.random() * 0.02;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.twinkle = Math.random() * Math.PI * 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.twinkle += 0.2;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life * (0.5 + Math.sin(this.twinkle) * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;

    // Star shape
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = Math.cos(angle) * this.size;
      const y = Math.sin(angle) * this.size;
      if (i === 0) ctx.moveTo(this.x + x, this.y + y);
      else ctx.lineTo(this.x + x, this.y + y);

      const midAngle = angle + Math.PI / 4;
      const mx = Math.cos(midAngle) * this.size * 0.4;
      const my = Math.sin(midAngle) * this.size * 0.4;
      ctx.lineTo(this.x + mx, this.y + my);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class PurpleRing {
  constructor(canvas) {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = 0;
    this.maxRadius = Math.max(canvas.width, canvas.height) * 0.8;
    this.life = 1;
  }

  update() {
    this.radius += 15;
    this.life = 1 - (this.radius / this.maxRadius);
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life * 0.6;
    ctx.strokeStyle = '#9146FF';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#9146FF';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function trigger(canvas, ctx, textContainer, event) {
  const username = event.username || 'Someone';
  const months = event.months || 1;
  const particles = [];
  let isAnimating = true;

  // Update text
  const nameEl = textContainer.querySelector('.sub-name');
  const monthsEl = textContainer.querySelector('.sub-months');
  if (nameEl) nameEl.textContent = username;
  if (monthsEl) {
    if (months === 1) {
      monthsEl.textContent = 'just subscribed!';
    } else {
      monthsEl.textContent = `${months} months!`;
    }
  }

  // Screen shake (gentle)
  document.body.classList.add('screen-shake');
  setTimeout(() => document.body.classList.remove('screen-shake'), 400);

  // Show text
  textContainer.classList.remove('hide');
  textContainer.classList.add('show');

  // Spawn purple rings
  for (let i = 0; i < 3; i++) {
    setTimeout(() => particles.push(new PurpleRing(canvas)), i * 300);
  }

  // Spawn hearts
  function spawnHearts() {
    for (let i = 0; i < 5; i++) {
      particles.push(new Heart(canvas));
    }
  }

  const heartInterval = setInterval(spawnHearts, 150);
  setTimeout(() => clearInterval(heartInterval), 3000);

  // Spawn sparkles around center
  function spawnSparkles() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < 8; i++) {
      particles.push(new Sparkle(
        cx + (Math.random() - 0.5) * 300,
        cy + (Math.random() - 0.5) * 200
      ));
    }
  }

  for (let i = 0; i < 5; i++) {
    setTimeout(spawnSparkles, i * 400);
  }

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

export const css = `
  #subscribe-alert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    text-align: center;
    opacity: 0;
    pointer-events: none;
    z-index: 100;
  }

  #subscribe-alert.show { animation: popIn 0.5s ease-out forwards; }
  #subscribe-alert.hide { animation: popOut 0.5s ease-in forwards; }

  #subscribe-alert .sub-text {
    font-size: 70px;
    font-weight: 900;
    color: #9146FF;
    text-shadow: 0 0 20px #9146FF, 0 0 40px #FF69B4, 4px 4px 0 #000;
    animation: pulse 0.5s ease-in-out infinite alternate;
  }

  #subscribe-alert .sub-name {
    font-size: 52px;
    font-weight: bold;
    color: #FF69B4;
    text-shadow: 0 0 15px #FF69B4, 3px 3px 0 #000;
    margin-top: 10px;
  }

  #subscribe-alert .sub-months {
    font-size: 32px;
    color: #FFF;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    margin-top: 5px;
  }
`;
