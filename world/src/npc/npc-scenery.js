import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';

/**
 * Build a small themed home/booth beside each NPC so the world feels lived-in.
 * type comes from NPC life data: gym, cottage, workstation, foodstall, tent,
 * bench, library, office, workshop.
 *
 * Each home is placed a short step away from the NPC's anchor, in warm
 * fairy-tale materials matching the rest of the world.
 */
export function createNPCScenery(npcLifeData, noise2D) {
  const group = new THREE.Group();
  group.name = 'npc-scenery';

  npcLifeData.forEach(npc => {
    if (!npc.homeType) return;
    // Place the home ~3 units further from the pole than the NPC anchor
    const homeAngle = npc.position.angle + 0.06;
    const homeRadius = npc.position.radius + 2.5;
    const home = buildHome(npc.homeType, npc.color);
    placeOnSphere(home, homeAngle, homeRadius, noise2D, 0);
    home.rotateY(Math.random() * Math.PI * 2);
    group.add(home);
  });

  return group;
}

function buildHome(type, accentColor) {
  switch (type) {
    case 'gym':         return buildGym(accentColor);
    case 'cottage':     return buildCottage(accentColor);
    case 'workstation': return buildWorkstation(accentColor);
    case 'foodstall':   return buildFoodStall(accentColor);
    case 'tent':        return buildTent(accentColor);
    case 'bench':       return buildBench(accentColor);
    case 'library':     return buildLibrary(accentColor);
    case 'office':      return buildOffice(accentColor);
    case 'workshop':    return buildWorkshop(accentColor);
    default:            return buildBench(accentColor);
  }
}

const wood = () => new THREE.MeshStandardMaterial({ color: 0xb88454, roughness: 0.9 });
const stone = () => new THREE.MeshStandardMaterial({ color: 0xe6d8bc, roughness: 0.92 });
const roof = () => new THREE.MeshStandardMaterial({ color: 0xc06a3a, roughness: 0.85 });
const metal = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.3 });

function buildCottage(accent) {
  const g = new THREE.Group();
  // walls
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), stone());
  body.position.y = 0.9; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // roof
  const r = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.4, 4), roof());
  r.position.y = 2.5; r.rotation.y = Math.PI / 4; r.castShadow = true; g.add(r);
  // door
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x6a4020, roughness: 0.85 }));
  door.position.set(0, 0.5, 1.11); g.add(door);
  // window
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xbfe0e8, emissive: 0xfff0c0, emissiveIntensity: 0.25 }));
  win.position.set(0.75, 1.1, 1.11); g.add(win);
  // chimney puff
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), stone());
  chim.position.set(0.7, 2.6, 0.2); g.add(chim);
  return g;
}

function buildGym(accent) {
  const g = new THREE.Group();
  const mat = metal(accent);
  // platform
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 8), stone());
  plat.position.y = 0.15; plat.receiveShadow = true; g.add(plat);
  // 4 posts + beam frame (open-air gym)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), mat);
    post.position.set(Math.cos(a) * 1.3, 1.45, Math.sin(a) * 1.3);
    post.castShadow = true; g.add(post);
  }
  // top ring beam
  const beam = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 8, 16), mat);
  beam.position.y = 2.7; beam.rotation.x = Math.PI / 2; g.add(beam);
  // a dumbbell prop
  const db = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), metal(0x333333));
  db.position.set(0.4, 0.4, 0.6); g.add(db);
  const dl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8), metal(0x222222));
  dl.rotation.z = Math.PI / 2; dl.position.set(0.1, 0.4, 0.6); g.add(dl);
  const dr = dl.clone(); dr.position.set(0.7, 0.4, 0.6); g.add(dr);
  return g;
}

function buildWorkstation(accent) {
  const g = new THREE.Group();
  // desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.0), wood());
  desk.position.y = 0.8; desk.castShadow = true; desk.receiveShadow = true; g.add(desk);
  // legs
  for (const [sx, sz] of [[-0.8,-0.4],[0.8,-0.4],[-0.8,0.4],[0.8,0.4]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), wood());
    leg.position.set(sx, 0.4, sz); g.add(leg);
  }
  // monitor (glowing screen)
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  mon.position.set(0, 1.25, -0.3); g.add(mon);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xdceaf2, emissive: accent, emissiveIntensity: 0.25 }));
  screen.position.set(0, 1.25, -0.27); g.add(screen);
  // stool
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8), wood());
  stool.position.set(0, 0.4, 0.5); g.add(stool);
  return g;
}

function buildFoodStall(accent) {
  const g = new THREE.Group();
  // counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.0), wood());
  counter.position.y = 0.55; counter.castShadow = true; counter.receiveShadow = true; g.add(counter);
  // striped awning
  const awlMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, roughness: 0.8 });
  const awning = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 12, 1, true, 0, Math.PI), awlMat);
  awning.rotation.y = Math.PI / 2; awning.position.y = 1.6; g.add(awning);
  // posts
  for (const sx of [-1.0, 1.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), wood());
    post.position.set(sx, 1.0, 0); g.add(post);
  }
  // lantern
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd070, emissiveIntensity: 1.4 }));
  lamp.position.set(0.9, 1.7, 0.4); g.add(lamp);
  const pl = new THREE.PointLight(0xffd58a, 1.0, 6, 2); pl.position.copy(lamp.position); g.add(pl);
  return g;
}

function buildTent(accent) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.9, flatShading: true });
  const tent = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 6), mat);
  tent.position.y = 1.1; tent.rotation.y = Math.PI / 6; tent.castShadow = true; g.add(tent);
  // campfire
  const logMat = wood();
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 5), logMat);
    log.rotation.z = Math.PI / 2; log.rotation.y = (i / 3) * Math.PI;
    log.position.set(1.4, 0.06, 0.2); g.add(log);
  }
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff6622, emissiveIntensity: 1.6 }));
  fire.position.set(1.4, 0.2, 0.2); g.add(fire);
  const fl = new THREE.PointLight(0xff8844, 1.2, 6, 2); fl.position.copy(fire.position); g.add(fl);
  return g;
}

function buildBench(accent) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.5), wood());
  seat.position.y = 0.5; seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
  for (const sx of [-0.6, 0.6]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.45), wood());
    leg.position.set(sx, 0.25, 0); g.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), wood());
  back.position.set(0, 0.8, -0.2); g.add(back);
  // a little flower pot beside
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0xc06a3a, roughness: 0.9 }));
  pot.position.set(1.0, 0.15, 0.3); g.add(pot);
  const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7, emissive: accent, emissiveIntensity: 0.1 }));
  bloom.position.set(1.0, 0.4, 0.3); g.add(bloom);
  return g;
}

function buildLibrary(accent) {
  const g = new THREE.Group();
  // base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.4), stone());
  base.position.y = 0.2; base.receiveShadow = true; g.add(base);
  // book stacks (like the library landmark)
  const hues = [0.02, 0.08, 0.55, 0.75, 0.33];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Color().setHSL(hues[i % hues.length], 0.4, 0.5);
    const stack = new THREE.Mesh(new THREE.BoxGeometry(1.4 - i * 0.18, 0.5, 1.1 - i * 0.18),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
    stack.position.y = 0.65 + i * 0.5; stack.rotation.y = i * 0.18; stack.castShadow = true;
    g.add(stack);
  }
  // reading lantern
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd070, emissiveIntensity: 1.3 }));
  lamp.position.set(0, 2.4, 0); g.add(lamp);
  const pl = new THREE.PointLight(0xffd58a, 1.0, 6, 2); pl.position.copy(lamp.position); g.add(pl);
  return g;
}

function buildOffice(accent) {
  const g = new THREE.Group();
  // small podium/desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.85 }));
  desk.position.y = 0.55; desk.castShadow = true; desk.receiveShadow = true; g.add(desk);
  // notice board
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xc9a878, roughness: 0.85 }));
  board.position.set(0, 1.6, -0.5); g.add(board);
  // a couple of paper notes
  for (let i = 0; i < 3; i++) {
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xfff8d0, roughness: 0.9, side: THREE.DoubleSide }));
    note.position.set(-0.35 + i * 0.35, 1.7 + (i % 2) * 0.1, -0.45);
    note.rotation.y = (i - 1) * 0.2; g.add(note);
  }
  return g;
}

function buildWorkshop(accent) {
  const g = new THREE.Group();
  // workbench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.9), wood());
  bench.position.y = 0.55; bench.castShadow = true; bench.receiveShadow = true; g.add(bench);
  // gear props
  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 10),
    metal(0x888888));
  gear.rotation.x = Math.PI / 2; gear.position.set(0.4, 1.05, 0); g.add(gear);
  // tool rack
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), wood());
  rack.position.set(0, 1.6, -0.4); g.add(rack);
  for (let i = -1; i <= 1; i++) {
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08),
      metal(accent));
    tool.position.set(i * 0.4, 1.35, -0.4); g.add(tool);
  }
  return g;
}
