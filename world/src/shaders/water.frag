varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vDisplacement;
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

void main() {
  float mixFactor = smoothstep(-0.2, 0.3, vDisplacement);
  vec3 color = mix(uDeepColor, uShallowColor, mixFactor);

  // Foam on wave peaks
  float foam = smoothstep(0.2, 0.35, vDisplacement);
  color = mix(color, vec3(0.9, 0.95, 1.0), foam * 0.5);

  // Subtle sparkle
  float sparkle = sin(vWorldPos.x * 5.0 + uTime * 2.0) *
                  sin(vWorldPos.z * 5.0 + uTime * 1.5) * 0.1;
  color += vec3(sparkle) * step(0.0, vDisplacement);

  gl_FragColor = vec4(color, 0.78);
}
