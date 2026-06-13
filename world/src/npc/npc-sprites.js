import * as THREE from 'three';

/**
 * Generate a 2D character sprite texture for an NPC using Canvas 2D API.
 * Each NPC gets a unique look based on their config (color, accessory).
 */
export function generateNPCSprite(config) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const mainColor = '#' + new THREE.Color(config.color).getHexString();
  const accColor = '#' + new THREE.Color(config.accessoryColor).getHexString();
  const skinColor = '#fdd9b5';
  const hairColor = '#3a2a1a';
  const eyeColor = '#1a1a1a';

  // Center coordinates
  const cx = size / 2;

  // === Body (tunic/shirt shape) ===
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.moveTo(cx - 18, 62);
  ctx.lineTo(cx - 22, 95);
  ctx.lineTo(cx - 16, 108);
  ctx.lineTo(cx + 16, 108);
  ctx.lineTo(cx + 22, 95);
  ctx.lineTo(cx + 18, 62);
  ctx.closePath();
  ctx.fill();

  // Body outline
  ctx.strokeStyle = darkenColor(mainColor, 0.3);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // === Belt/waist detail ===
  ctx.fillStyle = darkenColor(mainColor, 0.4);
  ctx.fillRect(cx - 18, 82, 36, 4);

  // === Legs ===
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(cx - 12, 108, 10, 14);
  ctx.fillRect(cx + 2, 108, 10, 14);

  // === Shoes ===
  ctx.fillStyle = '#4a3728';
  ctx.beginPath();
  ctx.ellipse(cx - 7, 122, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, 122, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // === Arms ===
  ctx.fillStyle = mainColor;
  // Left arm
  ctx.beginPath();
  ctx.moveTo(cx - 18, 65);
  ctx.lineTo(cx - 28, 88);
  ctx.lineTo(cx - 22, 90);
  ctx.lineTo(cx - 14, 70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(cx + 18, 65);
  ctx.lineTo(cx + 28, 88);
  ctx.lineTo(cx + 22, 90);
  ctx.lineTo(cx + 14, 70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // === Hands ===
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(cx - 25, 90, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 25, 90, 5, 0, Math.PI * 2);
  ctx.fill();

  // === Neck ===
  ctx.fillStyle = skinColor;
  ctx.fillRect(cx - 5, 55, 10, 10);

  // === Head ===
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(cx, 42, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8c9a0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // === Hair ===
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(cx, 38, 18, Math.PI, 2 * Math.PI);
  ctx.fill();
  // Side hair
  ctx.fillRect(cx - 18, 32, 5, 14);
  ctx.fillRect(cx + 13, 32, 5, 14);

  // === Eyes ===
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(cx - 7, 42, 2.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, 42, 2.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - 6, 41, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 8, 41, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // === Mouth ===
  ctx.strokeStyle = '#c4846a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, 48, 4, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // === Cheek blush ===
  ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx - 13, 46, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 13, 46, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // === Accessory ===
  drawAccessory(ctx, config.accessory, accColor, cx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

function drawAccessory(ctx, accessory, color, cx) {
  ctx.save();

  switch (accessory) {
    case 'dumbbell': {
      // Dumbbell in right hand
      ctx.fillStyle = color;
      ctx.fillRect(cx + 20, 82, 14, 3);
      ctx.beginPath();
      ctx.arc(cx + 20, 83, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 34, 83, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'hat': {
      // Chef/explorer hat
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(cx, 26, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 12, 12, 24, 16);
      ctx.beginPath();
      ctx.arc(cx, 12, 12, Math.PI, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'glasses': {
      // Round glasses
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - 7, 42, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 7, 42, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 1, 42);
      ctx.lineTo(cx + 1, 42);
      ctx.stroke();
      break;
    }
    case 'backpack': {
      // Backpack on back
      ctx.fillStyle = color;
      ctx.fillRect(cx - 14, 64, 28, 22);
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 14, 64, 28, 22);
      // Straps
      ctx.strokeStyle = darkenColor(color, 0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, 64);
      ctx.lineTo(cx - 14, 55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 10, 64);
      ctx.lineTo(cx + 14, 55);
      ctx.stroke();
      break;
    }
    case 'book': {
      // Book in hand
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(cx + 25, 82);
      ctx.rotate(-0.3);
      ctx.fillRect(-8, -12, 16, 22);
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -12, 16, 22);
      // Page lines
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-4, -6 + i * 6);
        ctx.lineTo(4, -6 + i * 6);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'sword': {
      // Sword on back
      ctx.fillStyle = '#c0c0c0';
      ctx.save();
      ctx.translate(cx + 16, 50);
      ctx.rotate(-0.4);
      ctx.fillRect(-2, -20, 4, 35);
      // Handle
      ctx.fillStyle = color;
      ctx.fillRect(-3, 15, 6, 8);
      // Guard
      ctx.fillRect(-6, 14, 12, 3);
      ctx.restore();
      break;
    }
    case 'heart': {
      // Heart above head
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(cx, 18);
      ctx.scale(0.8, 0.8);
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-10, -5, -10, -15, 0, -10);
      ctx.bezierCurveTo(10, -15, 10, -5, 0, 5);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'phone': {
      // Phone in hand
      ctx.fillStyle = '#222';
      ctx.save();
      ctx.translate(cx + 25, 84);
      ctx.rotate(-0.2);
      ctx.fillRect(-5, -9, 10, 18);
      // Screen
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-3, -6, 6, 12);
      ctx.restore();
      break;
    }
    case 'pen': {
      // Pen in hand
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(cx + 26, 80);
      ctx.rotate(-0.6);
      ctx.fillRect(-1.5, -15, 3, 25);
      // Pen tip
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(-1.5, 10);
      ctx.lineTo(1.5, 10);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'notebook': {
      // Notebook in hand
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(cx - 26, 82);
      ctx.rotate(0.2);
      ctx.fillRect(-8, -10, 16, 20);
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -10, 16, 20);
      // Spiral binding
      ctx.fillStyle = '#888';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-8, -6 + i * 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'wrench': {
      // Wrench in hand
      ctx.fillStyle = '#888';
      ctx.save();
      ctx.translate(cx + 26, 82);
      ctx.rotate(-0.5);
      ctx.fillRect(-2, -12, 4, 22);
      // Wrench head
      ctx.beginPath();
      ctx.arc(0, -14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(0, -14, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'cup': {
      // Cup in hand
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(cx + 25, 86);
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-4, 8);
      ctx.lineTo(4, 8);
      ctx.lineTo(6, -8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = darkenColor(color, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Handle
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(7, 0, 4, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Steam
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.quadraticCurveTo(0, -16, 2, -12);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'tie': {
      // Necktie
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, 58);
      ctx.lineTo(cx - 4, 62);
      ctx.lineTo(cx - 2, 85);
      ctx.lineTo(cx, 90);
      ctx.lineTo(cx + 2, 85);
      ctx.lineTo(cx + 4, 62);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      break;
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
