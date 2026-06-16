import * as THREE from 'three';

/**
 * Generate a high-quality 2D character sprite (256px) with shading, glow, and detail.
 */
export function generateNPCSprite(config) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const mainColor = '#' + new THREE.Color(config.color).getHexString();
  const accColor = '#' + new THREE.Color(config.accessoryColor).getHexString();
  const skinBase = '#fdd9b5';
  const skinShadow = '#e8c09a';
  const hairColor = '#2a1a0a';
  const eyeColor = '#0a0a0a';
  const cx = size / 2;

  // === Shadow on ground ===
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, 230, 32, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // === Body with shading ===
  // Main torso
  const bodyGrad = ctx.createLinearGradient(cx - 36, 100, cx + 36, 200);
  bodyGrad.addColorStop(0, lightenColor(mainColor, 0.15));
  bodyGrad.addColorStop(0.4, mainColor);
  bodyGrad.addColorStop(1, darkenColor(mainColor, 0.25));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 32, 110);
  ctx.quadraticCurveTo(cx - 40, 160, cx - 30, 200);
  ctx.lineTo(cx - 20, 215);
  ctx.lineTo(cx + 20, 215);
  ctx.lineTo(cx + 30, 200);
  ctx.quadraticCurveTo(cx + 40, 160, cx + 32, 110);
  ctx.closePath();
  ctx.fill();

  // Body outline
  ctx.strokeStyle = darkenColor(mainColor, 0.4);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belt/waist detail
  const beltGrad = ctx.createLinearGradient(cx - 30, 155, cx + 30, 170);
  beltGrad.addColorStop(0, darkenColor(mainColor, 0.5));
  beltGrad.addColorStop(0.5, darkenColor(mainColor, 0.35));
  beltGrad.addColorStop(1, darkenColor(mainColor, 0.5));
  ctx.fillStyle = beltGrad;
  ctx.fillRect(cx - 30, 158, 60, 8);

  // Belt buckle
  ctx.fillStyle = '#c8a84a';
  ctx.fillRect(cx - 5, 158, 10, 8);
  ctx.strokeStyle = '#a08838';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 5, 158, 10, 8);

  // Collar
  ctx.fillStyle = lightenColor(mainColor, 0.2);
  ctx.beginPath();
  ctx.moveTo(cx - 14, 108);
  ctx.lineTo(cx, 118);
  ctx.lineTo(cx + 14, 108);
  ctx.lineTo(cx + 18, 114);
  ctx.lineTo(cx, 126);
  ctx.lineTo(cx - 18, 114);
  ctx.closePath();
  ctx.fill();

  // === Legs ===
  const legGrad = ctx.createLinearGradient(0, 215, 0, 242);
  legGrad.addColorStop(0, '#1a2538');
  legGrad.addColorStop(1, '#101828');
  ctx.fillStyle = legGrad;
  // Left leg
  ctx.beginPath();
  ctx.moveTo(cx - 20, 215);
  ctx.lineTo(cx - 22, 240);
  ctx.lineTo(cx - 6, 240);
  ctx.lineTo(cx - 4, 215);
  ctx.closePath();
  ctx.fill();
  // Right leg
  ctx.beginPath();
  ctx.moveTo(cx + 4, 215);
  ctx.lineTo(cx + 6, 240);
  ctx.lineTo(cx + 22, 240);
  ctx.lineTo(cx + 20, 215);
  ctx.closePath();
  ctx.fill();

  // === Shoes ===
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(cx - 14, 242, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14, 242, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shoe highlights
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath();
  ctx.ellipse(cx - 14, 240, 10, 3, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14, 240, 10, 3, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // === Arms ===
  // Left arm
  const armGrad = ctx.createLinearGradient(cx - 50, 110, cx - 30, 180);
  armGrad.addColorStop(0, mainColor);
  armGrad.addColorStop(1, darkenColor(mainColor, 0.15));
  ctx.fillStyle = armGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 32, 115);
  ctx.quadraticCurveTo(cx - 52, 145, cx - 48, 175);
  ctx.lineTo(cx - 40, 178);
  ctx.quadraticCurveTo(cx - 44, 148, cx - 26, 120);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = darkenColor(mainColor, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Right arm
  ctx.fillStyle = armGrad;
  ctx.beginPath();
  ctx.moveTo(cx + 32, 115);
  ctx.quadraticCurveTo(cx + 52, 145, cx + 48, 175);
  ctx.lineTo(cx + 40, 178);
  ctx.quadraticCurveTo(cx + 44, 148, cx + 26, 120);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // === Hands ===
  ctx.fillStyle = skinBase;
  ctx.beginPath();
  ctx.arc(cx - 44, 180, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 44, 180, 8, 0, Math.PI * 2);
  ctx.fill();
  // Hand shadow
  ctx.fillStyle = skinShadow;
  ctx.beginPath();
  ctx.arc(cx - 44, 182, 6, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 44, 182, 6, 0, Math.PI);
  ctx.fill();

  // === Neck ===
  ctx.fillStyle = skinShadow;
  ctx.fillRect(cx - 8, 96, 16, 16);
  ctx.fillStyle = skinBase;
  ctx.fillRect(cx - 7, 96, 14, 12);

  // === Head ===
  // Head shadow
  const headGrad = ctx.createRadialGradient(cx, 76, 0, cx, 76, 32);
  headGrad.addColorStop(0, skinBase);
  headGrad.addColorStop(0.7, skinBase);
  headGrad.addColorStop(1, skinShadow);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(cx, 76, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e0b890';
  ctx.lineWidth = 1;
  ctx.stroke();

  // === Hair ===
  const hairGrad = ctx.createLinearGradient(cx - 30, 46, cx + 30, 76);
  hairGrad.addColorStop(0, lightenColor(hairColor, 0.1));
  hairGrad.addColorStop(1, hairColor);
  ctx.fillStyle = hairGrad;
  ctx.beginPath();
  ctx.arc(cx, 70, 30, Math.PI + 0.1, -0.1);
  ctx.fill();
  // Side hair
  ctx.fillRect(cx - 30, 62, 8, 20);
  ctx.fillRect(cx + 22, 62, 8, 20);
  // Hair highlights
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(cx - 10, 58, 12, Math.PI + 0.3, -0.3);
  ctx.fill();

  // === Eyes ===
  // Eye whites
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(cx - 11, 76, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 11, 76, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris
  ctx.fillStyle = '#3a2818';
  ctx.beginPath();
  ctx.arc(cx - 11, 77, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 11, 77, 4, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(cx - 11, 77, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 11, 77, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - 9, 75, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 13, 75, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Small secondary highlight
  ctx.beginPath();
  ctx.arc(cx - 13, 79, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 9, 79, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = darkenColor(hairColor, 0.1);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 18, 66);
  ctx.quadraticCurveTo(cx - 11, 63, cx - 5, 66);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 5, 66);
  ctx.quadraticCurveTo(cx + 11, 63, cx + 18, 66);
  ctx.stroke();

  // === Nose ===
  ctx.strokeStyle = '#d8a880';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, 80);
  ctx.lineTo(cx - 2, 86);
  ctx.quadraticCurveTo(cx, 88, cx + 2, 86);
  ctx.stroke();

  // === Mouth ===
  ctx.strokeStyle = '#c4846a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, 92, 6, 0.15, Math.PI - 0.15);
  ctx.stroke();
  // Upper lip highlight
  ctx.strokeStyle = '#daa890';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, 91, 4, Math.PI + 0.3, -0.3);
  ctx.stroke();

  // === Cheek blush ===
  ctx.fillStyle = 'rgba(255, 140, 140, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx - 22, 86, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 22, 86, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // === Accessory ===
  drawAccessory(ctx, config.accessory, accColor, mainColor, cx);

  // === Ambient glow (theme color rim light) ===
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rimGrad = ctx.createRadialGradient(cx, 130, 40, cx, 130, 100);
  rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
  rimGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
  rimGrad.addColorStop(1, hexToRgba(mainColor, 0.08));
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function drawAccessory(ctx, accessory, color, mainColor, cx) {
  ctx.save();
  switch (accessory) {
    case 'dumbbell': {
      ctx.fillStyle = '#555';
      ctx.fillRect(cx + 36, 164, 24, 5);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx + 36, 166, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 60, 166, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = darkenColor(color, 0.3);
      ctx.beginPath(); ctx.arc(cx + 36, 166, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 60, 166, 5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'hat': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, 48, 36, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 20, 22, 40, 28);
      ctx.beginPath(); ctx.arc(cx, 22, 20, Math.PI, Math.PI * 2); ctx.fill();
      // Hat band
      ctx.fillStyle = darkenColor(color, 0.4);
      ctx.fillRect(cx - 20, 42, 40, 5);
      break;
    }
    case 'glasses': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx - 11, 76, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 11, 76, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 1, 76); ctx.lineTo(cx + 1, 76); ctx.stroke();
      // Lens reflection
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx - 11, 74, 6, Math.PI + 0.5, -0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 11, 74, 6, Math.PI + 0.5, -0.5); ctx.stroke();
      break;
    }
    case 'backpack': {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(cx - 22, 118, 44, 36, 6);
      ctx.fill();
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Pocket
      ctx.fillStyle = darkenColor(color, 0.15);
      ctx.beginPath();
      ctx.roundRect(cx - 14, 130, 28, 18, 4);
      ctx.fill();
      // Straps
      ctx.strokeStyle = darkenColor(color, 0.25);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 16, 118); ctx.lineTo(cx - 22, 102); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 16, 118); ctx.lineTo(cx + 22, 102); ctx.stroke();
      break;
    }
    case 'book': {
      ctx.save();
      ctx.translate(cx + 42, 166);
      ctx.rotate(-0.25);
      ctx.fillStyle = color;
      ctx.fillRect(-14, -20, 28, 36);
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14, -20, 28, 36);
      // Pages
      ctx.fillStyle = '#f0ead8';
      ctx.fillRect(-10, -16, 22, 28);
      // Text lines
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(-6, -10 + i * 6); ctx.lineTo(8, -10 + i * 6); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'sword': {
      ctx.save();
      ctx.translate(cx + 26, 90);
      ctx.rotate(-0.35);
      // Blade
      const bladeGrad = ctx.createLinearGradient(-3, -40, 3, 20);
      bladeGrad.addColorStop(0, '#e0e0e0');
      bladeGrad.addColorStop(0.5, '#c0c0c0');
      bladeGrad.addColorStop(1, '#909090');
      ctx.fillStyle = bladeGrad;
      ctx.fillRect(-3, -40, 6, 55);
      // Handle
      ctx.fillStyle = color;
      ctx.fillRect(-4, 15, 8, 14);
      // Guard
      ctx.fillStyle = '#c8a84a';
      ctx.fillRect(-10, 13, 20, 4);
      ctx.restore();
      break;
    }
    case 'heart': {
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(cx, 34);
      ctx.scale(1.2, 1.2);
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-14, -6, -14, -18, 0, -12);
      ctx.bezierCurveTo(14, -18, 14, -6, 0, 6);
      ctx.fill();
      // Heart glow
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(-4, -8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'phone': {
      ctx.fillStyle = '#1a1a1a';
      ctx.save();
      ctx.translate(cx + 42, 168);
      ctx.rotate(-0.15);
      ctx.beginPath(); ctx.roundRect(-10, -16, 20, 32, 4); ctx.fill();
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-7, -12, 14, 24);
      // Screen content dots
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-4, -8 + i * 7, 8, 3);
      }
      ctx.restore();
      break;
    }
    case 'pen': {
      ctx.save();
      ctx.translate(cx + 46, 162);
      ctx.rotate(-0.5);
      ctx.fillStyle = color;
      ctx.fillRect(-2.5, -28, 5, 42);
      // Pen tip
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.moveTo(-2.5, 14);
      ctx.lineTo(2.5, 14);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.fill();
      // Gold ring
      ctx.fillStyle = '#c8a84a';
      ctx.fillRect(-3, -5, 6, 4);
      ctx.restore();
      break;
    }
    case 'notebook': {
      ctx.save();
      ctx.translate(cx - 46, 166);
      ctx.rotate(0.15);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(-14, -18, 28, 34, 3); ctx.fill();
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Spiral
      ctx.fillStyle = '#999';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.arc(-14, -12 + i * 6, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'wrench': {
      ctx.fillStyle = '#aaa';
      ctx.save();
      ctx.translate(cx + 46, 166);
      ctx.rotate(-0.4);
      ctx.fillRect(-3, -20, 6, 36);
      ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(0, -22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'cup': {
      ctx.save();
      ctx.translate(cx + 44, 172);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-10, -14);
      ctx.lineTo(-8, 12);
      ctx.lineTo(8, 12);
      ctx.lineTo(10, -14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Handle
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(12, 0, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      // Steam
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-3, -18); ctx.quadraticCurveTo(0, -26, 3, -20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -16); ctx.quadraticCurveTo(6, -24, 9, -18); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'tie': {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, 105);
      ctx.lineTo(cx - 6, 112);
      ctx.lineTo(cx - 3, 155);
      ctx.lineTo(cx, 162);
      ctx.lineTo(cx + 3, 155);
      ctx.lineTo(cx + 6, 112);
      ctx.closePath();
      ctx.fill();
      // Tie knot
      ctx.fillStyle = darkenColor(color, 0.2);
      ctx.beginPath();
      ctx.moveTo(cx, 105);
      ctx.lineTo(cx - 5, 110);
      ctx.lineTo(cx + 5, 110);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function darkenColor(hexColor, amount) {
  const c = new THREE.Color(hexColor);
  c.r = Math.max(0, c.r * (1 - amount));
  c.g = Math.max(0, c.g * (1 - amount));
  c.b = Math.max(0, c.b * (1 - amount));
  return '#' + c.getHexString();
}

function lightenColor(hexColor, amount) {
  const c = new THREE.Color(hexColor);
  c.r = Math.min(1, c.r + (1 - c.r) * amount);
  c.g = Math.min(1, c.g + (1 - c.g) * amount);
  c.b = Math.min(1, c.b + (1 - c.b) * amount);
  return '#' + c.getHexString();
}

function hexToRgba(hexColor, alpha) {
  const c = new THREE.Color(hexColor);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}
