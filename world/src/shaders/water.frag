varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vDisplacement;
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSunDir;

void main() {
  // Mix deep and shallow water tones by wave height
  float mixFactor = smoothstep(-0.2, 0.3, vDisplacement);
  vec3 color = mix(uDeepColor, uShallowColor, mixFactor);

  // Soft white foam on the brightest wave peaks
  float foam = smoothstep(0.22, 0.38, vDisplacement);
  color = mix(color, vec3(1.0, 0.99, 0.96), foam * 0.5);

  // Sun glitter: bright sparkles where wave facets face the sun
  vec3 n = normalize(vWorldNormal);
  vec3 sunDir = normalize(uSunDir);
  float sunFacing = max(dot(n, sunDir), 0.0);
  float glitter = pow(sunFacing, 80.0) * 0.7;
  float sparkle = sin(vWorldPos.x * 6.0 + uTime * 3.0) *
                  sin(vWorldPos.z * 6.0 + uTime * 2.0);
  glitter *= step(0.25, sparkle);
  color += vec3(1.0, 0.95, 0.78) * glitter;

  // Fresnel brightening toward glancing angles (sky reflection)
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  color = mix(color, vec3(0.82, 0.93, 1.0), fresnel * 0.4);

  gl_FragColor = vec4(color, 0.8);
}
