/**
 * Raid Alert Module
 *
 * Epic entrance when another streamer raids your channel!
 *
 * Event: { type: 'raid', username: 'RaiderName', viewers: 50 }
 */

const COLORS = ['#FF4500', '#FF6B00', '#FF8C00', '#FFA500', '#FFD700', '#FFFFFF'];

class Viking {
  constructor(canvas, side) {
    this.canvas = canvas;
    this.side = side; // 'left' or 'right'
    this.x = side === 'left' ? -100 : canvas.width + 100;
    this.targetX = side === 'left' ? canvas.width * 0.25 : canvas.width * 0.75;
    this.y = canvas.height * 0.6;
    this.size = 80;
    this.speed = 15;
    this.arrived = false;
    this.shakeTime = 0;
  }

  update() {
    if (!this.arrived) {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) < this.speed) {
        this.x = this.targetX;
        this.arrived = true;
        this.shakeTime = 20;
      } else {
        this.x += Math.sign(dx) * this.speed;
      }
    } else if (this.shakeTime > 0) {
      this.shakeTime--;
    }
    return true;
  }

  draw(ctx) {
    const shake = this.shakeTime > 0 ? (Math.random() - 0.5) * 10 : 0;

    ctx.save();
    ctx.translate(this.x + shake, this.y);

    // Viking helmet (simplified)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#F5DEB3';
    ctx.beginPath();
    ctx.moveTo(-this.size / 2, -this.size / 4);
    ctx.quadraticCurveTo(-this.size, -this.size, -this.size / 2, -this.size / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.size / 2, -this.size / 4);
    ctx.quadraticCurveTo(this.size, -this.size, this.size / 2, -this.size / 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.arc(0, this.size / 4, this.size / 3, 0, Math.PI * 2);
    ctx.fill();

    // Beard
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(-this.size / 4, this.size / 3);
    ctx.quadraticCurveTo(0, this.size, this.size / 4, this.size / 3);
    ctx.fill();

    ctx.restore();
  }
}

class FireParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -Math.random() * 6 - 2;
    this.size = Math.random() * 20 + 10;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.02;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class WarCry {
  constructor(canvas) {
    this.canvas = canvas;
    this.rings = [];
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
  }

  spawn() {
    this.rings.push({
      radius: 50,
      maxRadius: Math.max(this.canvas.width, this.canvas.height),
      life: 1,
    });
  }

  update() {
    this.rings = this.rings.filter(ring => {
      ring.radius += 20;
      ring.life = 1 - (ring.radius / ring.maxRadius);
      return ring.life > 0;
    });
    return this.rings.length > 0;
  }

  draw(ctx) {
    this.rings.forEach(ring => {
      ctx.save();
      ctx.globalAlpha = ring.life * 0.5;
      ctx.strokeStyle = '#FF4500';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#FF4500';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }
}

export function trigger(canvas, ctx, textContainer, event) {
  const username = event.username || 'A Viking Horde';
  const viewers = event.viewers || '???';
  const particles = [];
  let isAnimating = true;

  // Update text
  const nameEl = textContainer.querySelector('.raider-name');
  const countEl = textContainer.querySelector('.viewer-count');
  if (nameEl) nameEl.textContent = username;
  if (countEl) countEl.textContent = `${viewers} raiders`;

  // Screen shake
  document.body.classList.add('screen-shake');
  setTimeout(() => document.body.classList.remove('screen-shake'), 800);

  // Show text
  textContainer.classList.remove('hide');
  textContainer.classList.add('show');

  // Create vikings
  const leftViking = new Viking(canvas, 'left');
  const rightViking = new Viking(canvas, 'right');
  particles.push(leftViking, rightViking);

  // War cry rings
  const warCry = new WarCry(canvas);
  particles.push(warCry);

  // Spawn war cry rings
  for (let i = 0; i < 5; i++) {
    setTimeout(() => warCry.spawn(), i * 200);
  }

  // Spawn fire
  function spawnFire() {
    for (let i = 0; i < 10; i++) {
      particles.push(new FireParticle(
        Math.random() * canvas.width,
        canvas.height + 20
      ));
    }
  }

  const fireInterval = setInterval(spawnFire, 100);
  setTimeout(() => clearInterval(fireInterval), 3000);

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
  #raid-alert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    text-align: center;
    opacity: 0;
    pointer-events: none;
    z-index: 100;
  }

  #raid-alert.show { animation: popIn 0.5s ease-out forwards; }
  #raid-alert.hide { animation: popOut 0.5s ease-in forwards; }

  #raid-alert .raid-text {
    font-size: 80px;
    font-weight: 900;
    color: #FF4500;
    text-shadow: 0 0 20px #FF4500, 0 0 40px #FF6B00, 4px 4px 0 #000;
    animation: pulse 0.3s ease-in-out infinite alternate;
    letter-spacing: 6px;
  }

  #raid-alert .raider-name {
    font-size: 52px;
    font-weight: bold;
    color: #FFD700;
    text-shadow: 0 0 15px #FFD700, 3px 3px 0 #000;
    margin-top: 10px;
  }

  #raid-alert .viewer-count {
    font-size: 36px;
    color: #FFF;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    margin-top: 5px;
  }
`;
