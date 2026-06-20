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
// Fractal Brownian Motion
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
  float h = dir.y; // -1..1

  // === 薄暮粉橙柔暖渐变（替代原青天，避免光污染刺眼）===
  vec3 zenithColor    = vec3(0.45, 0.35, 0.55); // 柔紫粉（天顶）
  vec3 midSkyColor    = vec3(0.85, 0.55, 0.55); // 暖粉（中天）
  vec3 horizonColor   = vec3(0.98, 0.75, 0.50); // 橙金（地平线）
  vec3 groundHaze     = vec3(0.82, 0.66, 0.52); // 暖沙雾（地面）

  vec3 color;
  if (h > 0.0) {
    float t1 = smoothstep(0.0, 0.35, h);
    float t2 = smoothstep(0.25, 0.95, h);
    color = mix(horizonColor, midSkyColor, t1);
    color = mix(color, zenithColor, t2);
  } else {
    color = mix(horizonColor, groundHaze, smoothstep(0.0, -0.25, h));
  }

  // === 太阳光晕（降低强度，避免刺眼）===
  vec3 sunDir = normalize(uSunDir);
  float sunDot = max(dot(dir, sunDir), 0.0);
  float sunHalo = pow(sunDot, 8.0);
  color += vec3(1.0, 0.92, 0.72) * sunHalo * 0.35;   // 原0.55→0.35
  float sunCore = smoothstep(0.992, 0.999, sunDot);
  color = mix(color, vec3(1.0, 0.96, 0.86), sunCore);
  float sunBloom = pow(sunDot, 2.0) * 0.15;          // 原0.25→0.15
  color += vec3(1.0, 0.82, 0.58) * sunBloom;

  // === 柔和星点（仅仰望高空可见，远离太阳，不刺眼）===
  if (h > 0.3) {
    float starMask = smoothstep(0.3, 0.6, h) * (1.0 - sunDot * 0.6);
    // 亮星（稀疏，闪烁）
    vec2 starUv = vec2(atan(dir.z, dir.x) * 20.0, dir.y * 40.0);
    vec2 sid = floor(starUv);
    vec2 sf = fract(starUv);
    float starH = hash(sid);
    float starTwinkle = 0.5 + 0.5 * sin(uTime * (1.5 + starH * 3.0) + starH * 30.0);
    float starShape = smoothstep(0.45, 0.0, length(sf - 0.5));
    float starBright = step(0.92, starH) * starShape * starTwinkle;
    // 微星（密集，暗）
    vec2 starUv2 = vec2(atan(dir.z, dir.x) * 50.0, dir.y * 100.0);
    float microStar = step(0.97, hash(floor(starUv2))) * (0.4 + 0.6 * starTwinkle);
    vec3 starColor = mix(vec3(1.0, 0.95, 0.8), vec3(0.85, 0.9, 1.0), starH);
    color += starColor * (starBright * 0.85 + microStar * 0.3) * starMask;
  }
  // 注：极光带和流星已移除（用户反馈光污染多余）

  // === 柔和漂浮云（上半球，暖粉调呼应薄暮）===
  if (h > -0.05) {
    vec2 cloudUv = vec2(atan(dir.z, dir.x), dir.y) * vec2(0.6, 1.4);
    float drift = uTime * 0.012;
    float n = fbm(cloudUv * 2.2 + vec2(drift, 0.0));
    float n2 = fbm(cloudUv * 4.5 + vec2(drift * 1.7, drift * 0.6));
    float clouds = smoothstep(0.48, 0.82, n * 0.7 + n2 * 0.4);
    clouds *= smoothstep(0.0, 0.25, h);
    float cloudSun = pow(sunDot, 1.5) * 0.4;
    vec3 cloudColor = mix(vec3(0.98, 0.88, 0.82), vec3(1.0, 0.85, 0.7), cloudSun);
    vec3 cloudShadow = vec3(0.72, 0.58, 0.62);
    vec3 cloudFinal = mix(cloudShadow, cloudColor, clouds);
    color = mix(color, cloudFinal, clouds * 0.8);
  }

  gl_FragColor = vec4(color, 1.0);
}
