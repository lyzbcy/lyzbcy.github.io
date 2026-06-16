/**
 * Minimap overlay showing player position, NPCs, landmarks, and the tower.
 * Rendered on a 2D canvas in the corner.
 */
export class Minimap {
  constructor(npcs, landmarks) {
    this.npcs = npcs;
    this.landmarks = landmarks;
    this.size = 140;
    this.worldRadius = 35; // display radius in pixels

    this._createDOM();
  }

  _createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'minimap';
    this.container.style.cssText = `
      position: fixed; bottom: 80px; right: 18px; z-index: 15;
      width: ${this.size}px; height: ${this.size}px;
      border-radius: 50%; overflow: hidden;
      background: rgba(5, 10, 18, 0.7);
      border: 1px solid rgba(132, 215, 255, 0.2);
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      display: none;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size * 2;
    this.canvas.height = this.size * 2;
    this.canvas.style.cssText = `width: 100%; height: 100%;`;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    document.body.appendChild(this.container);
  }

  show() {
    this.container.style.display = 'block';
  }

  update(camera, controls) {
    const ctx = this.ctx;
    const s = this.canvas.width;
    const center = s / 2;
    const scale = this.worldRadius / this.worldRadius; // pixels per world unit

    ctx.clearRect(0, 0, s, s);

    // Background
    const bgGrad = ctx.createRadialGradient(center, center, 0, center, center, center);
    bgGrad.addColorStop(0, 'rgba(10, 20, 35, 0.9)');
    bgGrad.addColorStop(0.8, 'rgba(8, 15, 25, 0.8)');
    bgGrad.addColorStop(1, 'rgba(5, 10, 18, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, s, s);

    // Grid rings
    ctx.strokeStyle = 'rgba(132, 215, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let r = 0.25; r <= 1.0; r += 0.25) {
      ctx.beginPath();
      ctx.arc(center, center, center * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tower marker (center)
    ctx.fillStyle = 'rgba(132, 215, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(center, center, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(132, 215, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, 10, 0, Math.PI * 2);
    ctx.stroke();

    // NPC markers
    if (this.npcs?.userData?.interactables) {
      this.npcs.userData.interactables.forEach(npc => {
        const pos = npc.position;
        const mapX = center + (pos.x / this.worldRadius) * center * 0.85;
        const mapZ = center + (pos.z / this.worldRadius) * center * 0.85;

        // Only draw if within minimap bounds
        const dist = Math.sqrt((mapX - center) ** 2 + (mapZ - center) ** 2);
        if (dist > center - 5) return;

        const npcColor = npc.userData.type === 'npc'
          ? 'rgba(242, 201, 120, 0.8)'
          : 'rgba(132, 215, 255, 0.6)';

        ctx.fillStyle = npcColor;
        ctx.beginPath();
        ctx.arc(mapX, mapZ, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Landmark markers
    if (this.landmarks?.children) {
      this.landmarks.children.forEach(lm => {
        const pos = lm.position;
        const mapX = center + (pos.x / this.worldRadius) * center * 0.85;
        const mapZ = center + (pos.z / this.worldRadius) * center * 0.85;

        const dist = Math.sqrt((mapX - center) ** 2 + (mapZ - center) ** 2);
        if (dist > center - 5) return;

        ctx.fillStyle = 'rgba(200, 160, 80, 0.6)';
        ctx.beginPath();
        ctx.rect(mapX - 4, mapZ - 4, 8, 8);
        ctx.fill();
      });
    }

    // Player marker
    const camPos = camera.position;
    const playerX = center + (camPos.x / this.worldRadius) * center * 0.85;
    const playerZ = center + (camPos.z / this.worldRadius) * center * 0.85;

    // Player direction indicator
    const dir = new (camera.position.constructor)(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);
    const angle = Math.atan2(dir.x, dir.z);

    ctx.save();
    ctx.translate(playerX, playerZ);
    ctx.rotate(-angle);

    // Direction triangle
    ctx.fillStyle = '#84d7ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();

    // Player dot
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Outer ring
    ctx.strokeStyle = 'rgba(132, 215, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
