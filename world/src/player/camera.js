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

    this._init();
  }

  _init() {
    // Click to interact
    this.domElement.addEventListener('click', () => {
      if (!document.pointerLockElement) return;
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

    const allMeshes = [];
    this.interactables.forEach(obj => {
      if (obj.isMesh) {
        allMeshes.push(obj);
      } else {
        obj.traverse(child => {
          if (child.isMesh) {
            child.userData._parentData = obj.userData;
            allMeshes.push(child);
          }
        });
      }
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

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

    const allMeshes = [];
    this.interactables.forEach(obj => {
      if (obj.isMesh) {
        allMeshes.push(obj);
      } else {
        obj.traverse(child => {
          if (child.isMesh) allMeshes.push(child);
        });
      }
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);
    if (intersects.length > 0) {
      this.crosshair.classList.add('active');
    } else {
      this.crosshair.classList.remove('active');
    }
  }
}
