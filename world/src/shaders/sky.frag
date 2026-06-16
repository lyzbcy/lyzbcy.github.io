varying vec2 vUv;
varying vec3 vPosition;
uniform float uTime;
uniform vec3 uSunDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// Fractal Brownian Motion - layered cloud noise
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vPosition);
  float h = dir.y; // -1 (down) .. 1 (up)

  // === Sky gradient: warm horizon -> soft cyan top ===
  vec3 zenithColor    = vec3(0.42, 0.70, 0.84); // soft cyan
  vec3 midSkyColor    = vec3(0.62, 0.82, 0.88); // pale teal-aqua
  vec3 horizonColor   = vec3(0.98, 0.94, 0.86); // warm cream
  vec3 groundHaze     = vec3(0.88, 0.84, 0.76); // sandy haze near bottom

  vec3 color;
  if (h > 0.0) {
    float t1 = smoothstep(0.0, 0.35, h);
    float t2 = smoothstep(0.25, 0.95, h);
    color = mix(horizonColor, midSkyColor, t1);
    color = mix(color, zenithColor, t2);
  } else {
    color = mix(horizonColor, groundHaze, smoothstep(0.0, -0.25, h));
  }

  // === Sun glow ===
  vec3 sunDir = normalize(uSunDir);
  float sunDot = max(dot(dir, sunDir), 0.0);
  // Bright halo
  float sunHalo = pow(sunDot, 8.0);
  color += vec3(1.0, 0.95, 0.78) * sunHalo * 0.55;
  // Tight core
  float sunCore = smoothstep(0.992, 0.999, sunDot);
  color = mix(color, vec3(1.0, 0.98, 0.9), sunCore);
  // Wide warm bloom near sun
  float sunBloom = pow(sunDot, 2.0) * 0.25;
  color += vec3(1.0, 0.85, 0.6) * sunBloom;

  // === Soft drifting clouds (only upper hemisphere) ===
  if (h > -0.05) {
    vec2 cloudUv = vec2(atan(dir.z, dir.x), dir.y) * vec2(0.6, 1.4);
    float drift = uTime * 0.012;
    float n = fbm(cloudUv * 2.2 + vec2(drift, 0.0));
    float n2 = fbm(cloudUv * 4.5 + vec2(drift * 1.7, drift * 0.6));
    float clouds = smoothstep(0.48, 0.82, n * 0.7 + n2 * 0.4);

    // Fade clouds near horizon
    float horizonFade = smoothstep(0.0, 0.25, h);
    clouds *= horizonFade;

    // Cloud color: white with warm sun-side tint
    float cloudSun = pow(sunDot, 1.5) * 0.5;
    vec3 cloudColor = mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.92, 0.78), cloudSun);
    vec3 cloudShadow = vec3(0.72, 0.78, 0.84);

    vec3 cloudFinal = mix(cloudShadow, cloudColor, clouds);
    color = mix(color, cloudFinal, clouds * 0.85);
  }

  gl_FragColor = vec4(color, 1.0);
}
