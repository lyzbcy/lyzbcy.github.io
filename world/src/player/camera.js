import * as THREE from 'three';

/**
 * Interaction system using raycaster for NPC/screen clicking
 */
export class InteractionManager {
  constructor(camera, domElement, interactables, dialog) {
    this.camera = camera;
    this.domElement = domElement;
    this.interactables = interactables;
    this.dialog = dialog;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 15; // Increased for spherical world
    this.crosshair = document.getElementById('crosshair');
    this.interactPill = document.getElementById('interact-pill');
    this.currentTarget = null;

    this._init();
  }

  _init() {
    // Click to interact
    this.domElement.addEventListener('click', () => {
      this._checkInteraction();
    });

    // Touch tap to interact
    this.domElement.addEventListener('touchend', (e) => {
      if (e.target.closest('#joystick-zone') || e.target.closest('#dialog-overlay')) return;
      if (e.changedTouches.length === 1) {
        this._checkInteraction();
      }
    });
  }

  _checkInteraction() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this._getIntersections();

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData.type ? hit.userData : hit.userData._parentData;

      if (data && (data.type === 'npc' || data.type === 'screen')) {
        this.dialog.show(data);
      }
    }
  }

  /**
   * Update crosshair visual feedback
   */
  update() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this._getIntersections();
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData.type ? hit.userData : hit.userData._parentData;
      this.currentTarget = data || null;
      this.crosshair.classList.add('active');
      if (this.interactPill && data) {
        const label = data.type === 'npc'
          ? `和 ${data.name} 对话`
          : `查看 ${data.label}`;
        this.interactPill.textContent = `${label} · 点击交互`;
        this.interactPill.classList.add('visible');
      }
    } else {
      this.currentTarget = null;
      this.crosshair.classList.remove('active');
      this.interactPill?.classList.remove('visible');
    }
  }

  _getIntersections() {
    const allTargets = [];
    this.interactables.forEach(obj => {
      if (obj.isMesh || obj.isSprite) {
        allTargets.push(obj);
      } else {
        obj.traverse(child => {
          if (child.isMesh || child.isSprite) {
            child.userData._parentData = obj.userData;
            allTargets.push(child);
          }
        });
      }
    });

    return this.raycaster.intersectObjects(allTargets, false);
  }
}
