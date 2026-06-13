import * as THREE from 'three';
import { getTerrainHeightAtPosition, SPHERE_RADIUS } from '../world/terrain.js';

/**
 * Player movement controls for spherical world - WASD + touch joystick
 * Player walks on the surface of a sphere with gravity pointing toward center.
 */
export class PlayerControls {
  constructor(camera, noise2D, domElement) {
    this.camera = camera;
    this.noise2D = noise2D;
    this.domElement = domElement;

    this.moveSpeed = 6;
    this.mouseSpeed = 0.002;

    // Movement state
    this.keys = { w: false, a: false, s: false, d: false };
    this.position = new THREE.Vector3(0, SPHERE_RADIUS + 2, 8); // Start near north pole
    this.yaw = 0;
    this.pitch = 0;

    // Player height above terrain
    this.playerHeight = 1.8;

    // Touch joystick state
    this.joystickActive = false;
    this.joystickDirection = { x: 0, y: 0 };

    // Pointer lock state
    this.isLocked = false;

    this._initKeyboard();
    this._initMouse();
    this._initTouch();
  }

  _initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = true;
    });
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = false;
    });
  }

  _initMouse() {
    // Click to request pointer lock
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && !document.getElementById('dialog-overlay').classList.contains('visible')) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      document.getElementById('crosshair').style.display = this.isLocked ? 'block' : 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      this.yaw -= e.movementX * this.mouseSpeed;
      this.pitch -= e.movementY * this.mouseSpeed;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    });
  }

  _initTouch() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');

    if ('ontouchstart' in window) {
      zone.style.display = 'block';
      document.getElementById('hud').textContent = '左侧摇杆移动 · 右侧滑动转视角 · 点击 NPC 或屏幕交互';
    }

    let joystickCenter = { x: 0, y: 0 };
    const maxDist = 40;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.joystickActive = true;
      const rect = base.getBoundingClientRect();
      joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;

      const touch = e.touches[0];
      let dx = touch.clientX - joystickCenter.x;
      let dy = touch.clientY - joystickCenter.y;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      thumb.style.transform = `translate(${-50 + (dx / maxDist) * 30}%, ${-50 + (dy / maxDist) * 30}%)`;
      this.joystickDirection = { x: dx / maxDist, y: dy / maxDist };
    }, { passive: false });

    zone.addEventListener('touchend', () => {
      this.joystickActive = false;
      this.joystickDirection = { x: 0, y: 0 };
      thumb.style.transform = 'translate(-50%, -50%)';
    });

    // Touch look (right side of screen)
    let lastTouch = null;
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.target.closest('#joystick-zone') || e.target.closest('#dialog-overlay')) return;
      if (e.touches.length === 1) {
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (e.target.closest('#joystick-zone') || e.target.closest('#dialog-overlay')) return;
      if (lastTouch && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastTouch.x;
        const dy = e.touches[0].clientY - lastTouch.y;
        this.yaw -= dx * 0.004;
        this.pitch -= dy * 0.004;
        this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    this.domElement.addEventListener('touchend', () => {
      lastTouch = null;
    }, { passive: true });
  }

  update(deltaTime) {
    const normal = this.position.clone().normalize();

    // Compute tangent basis on sphere surface
    let refUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(refUp)) > 0.99) {
      refUp = new THREE.Vector3(0, 0, -1);
    }
    const east = new THREE.Vector3().crossVectors(refUp, normal).normalize();
    const north = new THREE.Vector3().crossVectors(normal, east).normalize();

    // Apply yaw rotation around normal
    const forward = north.clone().applyAxisAngle(normal, this.yaw);
    const right = east.clone().applyAxisAngle(normal, this.yaw);

    // Calculate move direction
    const moveDir = new THREE.Vector3(0, 0, 0);

    // Keyboard input
    if (this.keys.w) moveDir.add(forward);
    if (this.keys.s) moveDir.sub(forward);
    if (this.keys.d) moveDir.add(right);
    if (this.keys.a) moveDir.sub(right);

    // Joystick input
    if (this.joystickActive) {
      moveDir.add(forward.clone().multiplyScalar(-this.joystickDirection.y));
      moveDir.add(right.clone().multiplyScalar(this.joystickDirection.x));
    }

    if (moveDir.length() > 0) {
      moveDir.normalize();
      // Move along tangent, then re-project to sphere
      this.position.add(moveDir.multiplyScalar(this.moveSpeed * deltaTime));
    }

    // Re-project position to sphere surface
    const currentNormal = this.position.clone().normalize();
    const terrainRadius = getTerrainHeightAtPosition(
      this.noise2D, currentNormal.x, currentNormal.y, currentNormal.z
    );
    const surfaceRadius = terrainRadius + this.playerHeight;
    this.position.copy(currentNormal.multiplyScalar(surfaceRadius));

    // Update camera
    this.camera.position.copy(this.position);

    // Camera orientation: apply pitch around right vector
    const normalAtPlayer = this.position.clone().normalize();

    let refUp2 = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normalAtPlayer.dot(refUp2)) > 0.99) {
      refUp2 = new THREE.Vector3(0, 0, -1);
    }
    const east2 = new THREE.Vector3().crossVectors(refUp2, normalAtPlayer).normalize();
    const north2 = new THREE.Vector3().crossVectors(normalAtPlayer, east2).normalize();

    const fwd2 = north2.clone().applyAxisAngle(normalAtPlayer, this.yaw);
    const right2 = east2.clone().applyAxisAngle(normalAtPlayer, this.yaw);

    // Apply pitch
    const lookDir = fwd2.clone().applyAxisAngle(right2, this.pitch);
    const lookTarget = this.position.clone().add(lookDir);

    this.camera.lookAt(lookTarget);
    this.camera.up.copy(normalAtPlayer);
  }
}
