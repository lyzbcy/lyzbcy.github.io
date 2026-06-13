import * as THREE from 'three';

/**
 * Interaction system using raycaster for NPC/screen clicking
 */
export class InteractionManager {
  constructor(camera, domElement, interactables, dialog) {
    this.camera = camera;
    this.domElement = domElement;
    this.interactables = interactables; // Array of meshes/groups to check
    this.dialog = dialog;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10; // Only interact within 10 units
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
    // Cast ray from center of screen
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Collect all meshes from interactables (including children)
    const allMeshes = [];
    this.interactables.forEach(obj => {
      if (obj.isMesh) {
        allMeshes.push(obj);
      } else {
        obj.traverse(child => {
          if (child.isMesh) {
            // Store reference to parent's userData
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
