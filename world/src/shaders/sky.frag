varying vec2 vUv;
varying vec3 vPosition;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  // Gradient sky
  float t = smoothstep(-1.0, 1.0, normalize(vPosition).y);
  vec3 bottomColor = vec3(0.05, 0.05, 0.15);  // dark horizon
  vec3 topColor = vec3(0.02, 0.02, 0.08);      // deep night
  vec3 color = mix(bottomColor, topColor, t);

  // Warm glow near horizon
  float horizonGlow = exp(-abs(normalize(vPosition).y) * 3.0);
  color += vec3(0.15, 0.08, 0.04) * horizonGlow;

  // Stars
  vec2 starUv = vUv * 200.0;
  float star = hash(floor(starUv));
  float twinkle = sin(uTime * 2.0 + star * 6.28) * 0.5 + 0.5;
  if (star > 0.995 && t > 0.2) {
    color += vec3(0.8, 0.85, 1.0) * twinkle * smoothstep(0.2, 0.5, t);
  }

  gl_FragColor = vec4(color, 1.0);
}
