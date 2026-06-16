import * as THREE from 'three';
import { getSpherePosition, getTerrainHeightAtPosition } from '../world/terrain.js';
import { PERSONALITY_SPEED } from './npc-life-data.js';

/**
 * NPCLife — gives each NPC a daily routine.
 *
 * - Each NPC cycles through their schedule (states).
 * - 'walk' states move them toward the state's waypoint; other states keep
 *   them near it with a small idle sway.
 * - A mood speech bubble floats above them while they wander.
 * - When the player comes within `interactRange`, the NPC freezes, turns to
 *   face the player, and hides the bubble until the player leaves.
 */
export class NPCLife {
  constructor(npcs, playerCamera, noise2D) {
    this.npcs = npcs;           // Group whose userData.interactables holds NPC groups
    this.camera = playerCamera;
    this.noise2D = noise2D;
    this.interactRange = 6.5;   // distance at which an NPC stops to talk
    this.items = [];

    this._setup();
    this._createBubbleStyle();
  }

  _setup() {
    const list = this.npcs.userData.interactables || [];
    list.forEach((npcGroup, i) => {
      const cfg = npcGroup.userData;
      if (!cfg.schedule) return;

      const anchor = npcGroup.position.clone();
      const startState = cfg.schedule[0];

      this.items.push({
        group: npcGroup,
        sprite: npcGroup.getObjectByName('npc-sprite'),
        label: npcGroup.getObjectByName('npc-label'),
        cfg,
        schedule: cfg.schedule,
        stateIndex: i % cfg.schedule.length,
        timeInState: Math.random() * startState.duration, // desync NPCs
        anchor,                       // home position on the sphere
        target: anchor.clone(),       // current waypoint world position
        speedMul: PERSONALITY_SPEED[cfg.personality] || 1.0,
        bubbleEl: null,
        bubbleVisible: false,
        talking: false,               // frozen because player is near
        baseScale: this._getSpriteScale(npcGroup),
        phase: Math.random() * Math.PI * 2
      });

      this._createBubble(this.items[this.items.length - 1]);
    });
  }

  _getSpriteScale(npcGroup) {
    const s = npcGroup.getObjectByName('npc-sprite');
    return s ? s.scale.x : 3;
  }

  _createBubbleStyle() {
    if (document.getElementById('npc-bubble-styles')) return;
    const style = document.createElement('style');
    style.id = 'npc-bubble-styles';
    style.textContent = `
      .npc-mood-bubble {
        position: fixed;
        z-index: 25;
        transform: translate(-50%, -100%);
        padding: 7px 14px;
        background: #fffdf6;
        color: #5a3a1a;
        font-size: 0.82rem;
        font-family: 'Microsoft YaHei', sans-serif;
        border-radius: 16px;
        border: 2px solid #e8c98a;
        box-shadow: 0 6px 18px rgba(90,60,20,0.18);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.35s ease, transform 0.35s ease;
        max-width: 200px;
      }
      .npc-mood-bubble.visible {
        opacity: 1;
        transform: translate(-50%, -110%);
      }
      .npc-mood-bubble::after {
        content: '';
        position: absolute;
        left: 50%; bottom: -8px;
        transform: translateX(-50%);
        width: 0; height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 8px solid #fffdf6;
        filter: drop-shadow(0 1px 0 #e8c98a);
      }
    `;
    document.head.appendChild(style);
  }

  _createBubble(item) {
    const el = document.createElement('div');
    el.className = 'npc-mood-bubble';
    el.textContent = '';
    document.body.appendChild(el);
    item.bubbleEl = el;
  }

  setDialogOpen(open) {
    // When a dialog is open, suppress all bubbles & let the talked-to NPC freeze
    this.dialogOpen = open;
    if (open) {
      this.items.forEach(it => { it.bubbleVisible = false; this._updateBubble(it); });
    }
  }

  update(delta, elapsed) {
    const playerPos = this.camera.position;
    const suppress = !!this.dialogOpen;

    this.items.forEach((it, idx) => {
      // --- Advance schedule ---
      it.timeInState += delta;
      const state = it.schedule[it.stateIndex];
      if (it.timeInState >= state.duration) {
        it.timeInState = 0;
        it.stateIndex = (it.stateIndex + 1) % it.schedule.length;
      }
      const cur = it.schedule[it.stateIndex];

      // --- Check if player is near -> freeze & face player ---
      const distToPlayer = it.group.position.distanceTo(playerPos);
      it.talking = !suppress && distToPlayer < this.interactRange;

      if (it.talking) {
        // Face the player and stand still
        this._faceTowards(it.group, playerPos, delta * 6);
        // hide mood bubble while talking (dialog covers it)
        it.bubbleVisible = false;
      } else {
        // --- Move toward the current waypoint ---
        this._computeWaypoint(it, cur);
        if (cur.activity === 'walk') {
          this._moveTowards(it, it.target, delta, true);
        } else {
          // idle states: drift gently back to waypoint with a sway
          this._moveTowards(it, it.target, delta * 0.6, false);
        }
        // Face movement direction when walking
        if (cur.activity === 'walk') {
          this._faceTowards(it.group, it.target, delta * 5);
        } else {
          this._faceOutward(it.group);
        }

        // Show mood bubble unless suppressed
        it.bubbleVisible = !suppress;
        if (it.bubbleEl.textContent !== cur.mood) {
          it.bubbleEl.textContent = cur.mood;
        }
      }

      // --- Idle sway / activity bob ---
      this._animateActivity(it, elapsed, cur.activity);

      // --- Project bubble to screen ---
      this._updateBubble(it);
    });
  }

  /**
   * Compute the world-space target for the current schedule state,
   * based on the anchor (home) and the waypoint offset {da, dr}.
   */
  _computeWaypoint(it, state) {
    const a = it.cfg.position.angle + state.waypoint.da;
    const r = Math.max(6, it.cfg.position.radius + state.waypoint.dr);
    const { position } = getSpherePosition(a, r, this.noise2D);
    it.target.copy(position);
  }

  /**
   * Move the NPC group toward target along the sphere surface.
   * walking=true uses full speed; otherwise a slow drift.
   */
  _moveTowards(it, target, delta, walking) {
    const pos = it.group.position;
    const dir = target.clone().sub(pos);
    const surfaceDist = dir.length();

    if (surfaceDist < 0.15) return; // arrived

    // Step size: tangential speed projected back onto the sphere
    const baseSpeed = walking ? 2.2 * it.speedMul : 0.8;
    const step = Math.min(surfaceDist, baseSpeed * delta);

    // Move tangentially, then re-project to terrain surface
    pos.add(dir.normalize().multiplyScalar(step));
    const normal = pos.clone().normalize();
    const terrainR = getTerrainHeightAtPosition(this.noise2D, normal.x, normal.y, normal.z);
    pos.copy(normal.multiplyScalar(terrainR));
  }

  _faceTowards(group, target, t) {
    // Build a look-at that keeps the NPC upright on the sphere
    const normal = group.position.clone().normalize();
    const toTarget = target.clone().sub(group.position);
    // remove normal component so we get the tangent direction
    const proj = normal.clone().multiplyScalar(toTarget.dot(normal));
    const fwd = toTarget.sub(proj);
    if (fwd.lengthSq() < 1e-5) return;
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, normal).normalize();
    const correctedFwd = new THREE.Vector3().crossVectors(normal, right).normalize();
    const m = new THREE.Matrix4().makeBasis(right, normal, correctedFwd);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    group.quaternion.slerp(q, Math.min(1, t));
  }

  _faceOutward(group) {
    // Face along the outward radial from the north pole (default pleasant stance)
    const normal = group.position.clone().normalize();
    const northPole = new THREE.Vector3(0, 1, 0);
    let fwd = northPole.clone().sub(normal.clone().multiplyScalar(northPole.dot(normal)));
    if (fwd.lengthSq() < 1e-4) fwd = new THREE.Vector3(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, normal).normalize();
    const correctedFwd = new THREE.Vector3().crossVectors(normal, right).normalize();
    const m = new THREE.Matrix4().makeBasis(right, normal, correctedFwd);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    group.quaternion.slerp(q, 0.04);
  }

  _animateActivity(it, elapsed, activity) {
    const sprite = it.sprite;
    if (!sprite) return;
    const base = it.baseScale;

    switch (activity) {
      case 'lift': {
        // bob up & down like lifting weights
        sprite.position.y = 1.5 + Math.abs(Math.sin(elapsed * 4 + it.phase)) * 0.3;
        const sq = 1 + Math.sin(elapsed * 4 + it.phase) * 0.05;
        sprite.scale.set(base * sq, base * sq, 1);
        break;
      }
      case 'flex': {
        sprite.position.y = 1.5 + Math.sin(elapsed * 1.5 + it.phase) * 0.08;
        const sq = 1 + Math.sin(elapsed * 3 + it.phase) * 0.04;
        sprite.scale.set(base * sq, base / sq, 1);
        break;
      }
      case 'type':
      case 'tinker':
      case 'study':
      case 'write': {
        // leaning forward, slight fast bob
        sprite.position.y = 1.5 + Math.sin(elapsed * 6 + it.phase) * 0.05;
        sprite.scale.set(base, base, 1);
        break;
      }
      case 'cook':
      case 'eat': {
        sprite.position.y = 1.5 + Math.sin(elapsed * 2 + it.phase) * 0.1;
        sprite.scale.set(base, base, 1);
        break;
      }
      case 'think': {
        sprite.position.y = 1.5 + Math.sin(elapsed * 1.2 + it.phase) * 0.06;
        sprite.scale.set(base, base, 1);
        break;
      }
      case 'walk': {
        // walking bob
        sprite.position.y = 1.5 + Math.abs(Math.sin(elapsed * 7 + it.phase)) * 0.12;
        const sw = 1 + Math.sin(elapsed * 7 + it.phase) * 0.03;
        sprite.scale.set(base * sw, base, 1);
        break;
      }
      default: {
        // gentle idle breathing
        sprite.position.y = 1.5 + Math.sin(elapsed * 1.5 + it.phase) * 0.1;
        const br = 1 + Math.sin(elapsed * 2 + it.phase) * 0.03;
        sprite.scale.set(base * br, base * br, 1);
      }
    }
  }

  _updateBubble(it) {
    const el = it.bubbleEl;
    if (!el) return;

    if (!it.bubbleVisible) {
      el.classList.remove('visible');
      return;
    }

    // Project a point above the NPC's head into screen space
    const headWorld = it.group.position.clone();
    const normal = headWorld.clone().normalize();
    headWorld.addScaledVector(normal, 3.6);

    const projected = headWorld.clone().project(this.camera);
    // Behind camera?
    if (projected.z > 1) {
      el.classList.remove('visible');
      return;
    }
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    // Cull if too far from player (performance + clarity)
    const dist = it.group.position.distanceTo(this.camera.position);
    if (dist > 22) {
      el.classList.remove('visible');
      return;
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.add('visible');
  }

  dispose() {
    this.items.forEach(it => it.bubbleEl?.remove());
  }
}
