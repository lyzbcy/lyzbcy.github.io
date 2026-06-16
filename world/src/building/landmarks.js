import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';

/**
 * Themed landmark buildings for different world regions.
 * Each landmark gives a visual identity to its area.
 */
export function createLandmarks(noise2D) {
  const group = new THREE.Group();
  group.name = 'landmarks';

  // Warm, cheerful fairy-tale palette for each themed area
  const landmarks = [
    { type: 'gym',     angle: 0,             radius: 18, color: 0xc05a3a, glowColor: 0xff8a5a }, // terracotta
    { type: 'tech',    angle: Math.PI * 0.4, radius: 17, color: 0x4a86a8, glowColor: 0x7fc4e8 }, // soft sky blue
    { type: 'life',    angle: Math.PI * 0.8, radius: 20, color: 0xe0a850, glowColor: 0xffe0a0 }, // warm honey
    { type: 'travel',  angle: Math.PI * 1.2, radius: 19, color: 0x5a9a4a, glowColor: 0x9ad47a }, // meadow green
    { type: 'library', angle: Math.PI * 1.6, radius: 18, color: 0x9a6ab8, glowColor: 0xd0a8f0 }  // soft lavender
  ];

  landmarks.forEach(lm => {
    const building = createLandmarkBuilding(lm);
    placeOnSphere(building, lm.angle, lm.radius, noise2D, 0);
    group.add(building);
  });

  return group;
}

function createLandmarkBuilding(config) {
  const group = new THREE.Group();

  // Matte, paint-like fairy-tale base
  const baseMat = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true
  });

  // Soft accent — gentle glow, not neon
  const glowMat = new THREE.MeshStandardMaterial({
    color: config.glowColor,
    emissive: config.glowColor,
    emissiveIntensity: 0.6,
    roughness: 0.5,
    metalness: 0.1
  });

  switch (config.type) {
    case 'gym': {
      // Training arena: octagonal platform with pillars and floating ring
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.5, 0.4, 8),
        baseMat
      );
      platform.position.y = 0.2;
      platform.receiveShadow = true;
      group.add(platform);

      // 4 pillars
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.2, 3.5, 6),
          baseMat
        );
        pillar.position.set(Math.cos(a) * 1.8, 1.95, Math.sin(a) * 1.8);
        pillar.castShadow = true;
        group.add(pillar);

        // Pillar top glow
        const top = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          glowMat
        );
        top.position.set(Math.cos(a) * 1.8, 3.8, Math.sin(a) * 1.8);
        group.add(top);
      }

      // Floating ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.1, 8, 16),
        glowMat
      );
      ring.position.y = 4.0;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Light
      const light = new THREE.PointLight(config.glowColor, 4, 10, 2);
      light.position.y = 4.0;
      group.add(light);
      break;
    }

    case 'tech': {
      // Server tower: tall hexagonal structure with screens
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.2, 5, 6),
        baseMat
      );
      tower.position.y = 2.5;
      tower.castShadow = true;
      group.add(tower);

      // Screen panels on sides
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const screen = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 1.2),
          new THREE.MeshStandardMaterial({
            color: 0xdceaf2,
            emissive: config.glowColor,
            emissiveIntensity: 0.25
          })
        );
        screen.position.set(Math.cos(a) * 1.05, 3.5, Math.sin(a) * 1.05);
        screen.rotation.y = a + Math.PI;
        group.add(screen);
      }

      // Antenna
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2, 4),
        glowMat
      );
      antenna.position.y = 6;
      group.add(antenna);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glowMat);
      tip.position.y = 7;
      group.add(tip);

      const light = new THREE.PointLight(config.glowColor, 3, 8, 2);
      light.position.y = 5;
      group.add(light);
      break;
    }

    case 'life': {
      // Cozy cottage: warm dome house with chimney and lantern
      const house = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        baseMat
      );
      house.position.y = 0.0;
      house.castShadow = true;
      group.add(house);

      // Door
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 1.0),
        new THREE.MeshStandardMaterial({
          color: 0x4a3020,
          roughness: 0.9
        })
      );
      door.position.set(0, 0.5, 1.48);
      group.add(door);

      // Chimney
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1.2, 0.4),
        baseMat
      );
      chimney.position.set(0.6, 1.8, 0);
      group.add(chimney);

      // Warm lantern
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffdd88,
          emissive: 0xffcc44,
          emissiveIntensity: 2.5
        })
      );
      lantern.position.set(0, 0.3, 1.8);
      group.add(lantern);

      const warmLight = new THREE.PointLight(0xffd080, 5, 8, 2);
      warmLight.position.set(0, 0.5, 1.8);
      group.add(warmLight);
      break;
    }

    case 'travel': {
      // Explorer's camp: tent + signpost + campfire
      // Tent
      const tent = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 2.5, 4),
        baseMat
      );
      tent.position.y = 1.25;
      tent.rotation.y = Math.PI / 4;
      tent.castShadow = true;
      group.add(tent);

      // Signpost
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x5a4530, roughness: 0.9 })
      );
      post.position.set(2, 1.5, 0);
      group.add(post);

      // Sign boards
      for (let i = 0; i < 3; i++) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.2, 0.05),
          new THREE.MeshStandardMaterial({
            color: 0x7a6545,
            roughness: 0.85
          })
        );
        sign.position.set(2.4, 2.6 - i * 0.4, 0);
        sign.rotation.z = (i - 1) * 0.15;
        group.add(sign);
      }

      // Campfire
      const fireGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xff8844,
          emissive: 0xff6622,
          emissiveIntensity: 3.0
        })
      );
      fireGlow.position.set(-1.5, 0.2, 1);
      group.add(fireGlow);

      const fireLight = new THREE.PointLight(0xff8844, 4, 8, 2);
      fireLight.position.set(-1.5, 0.5, 1);
      group.add(fireLight);
      break;
    }

    case 'library': {
      // Mystic library: stacked books tower with floating orbs
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.5, 2.0),
        baseMat
      );
      base.position.y = 0.25;
      base.receiveShadow = true;
      group.add(base);

      // Book stacks
      for (let i = 0; i < 4; i++) {
        const stack = new THREE.Mesh(
          new THREE.BoxGeometry(1.6 - i * 0.2, 0.8, 1.6 - i * 0.2),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.75 + i * 0.05, 0.4, 0.25),
            roughness: 0.8
          })
        );
        stack.position.y = 0.9 + i * 0.8;
        stack.rotation.y = i * 0.2;
        stack.castShadow = true;
        group.add(stack);
      }

      // Floating knowledge orbs
      for (let i = 0; i < 5; i++) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          glowMat
        );
        const a = (i / 5) * Math.PI * 2;
        orb.position.set(Math.cos(a) * 1.2, 4.2 + Math.sin(i) * 0.3, Math.sin(a) * 1.2);
        group.add(orb);
      }

      const light = new THREE.PointLight(config.glowColor, 3.5, 10, 2);
      light.position.y = 4.5;
      group.add(light);
      break;
    }
  }

  return group;
}
