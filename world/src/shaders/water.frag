varying vec2 vUv;
varying float vElevation;
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

void main() {
  float mixFactor = smoothstep(-0.3, 0.3, vElevation);
  vec3 color = mix(uDeepColor, uShallowColor, mixFactor);

  // Foam on wave peaks
  float foam = smoothstep(0.25, 0.4, vElevation);
  color = mix(color, vec3(0.9, 0.95, 1.0), foam * 0.6);

  gl_FragColor = vec4(color, 0.75);
}
