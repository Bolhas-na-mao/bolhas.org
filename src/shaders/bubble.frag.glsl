uniform vec3 uColorPink;
uniform vec3 uColorBlue;
uniform vec3 uColorExcited;
uniform float uTime;
uniform vec3 uCameraPosition;
uniform float uIridescence;
uniform float uRefractiveIndex;
uniform sampler2D uEnvMap;
uniform float uExcitement;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying vec3 vViewPosition;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 thinFilmInterference(float cosTheta, float filmThickness) {
  vec3 wavelengths = vec3(650.0, 510.0, 475.0); 
  float opticalPath = 2.0 * filmThickness * sqrt(1.0 - pow(cosTheta, 2.0));
  vec3 phase = (opticalPath / wavelengths) * 6.283185;
  vec3 interference = cos(phase) * 0.5 + 0.5;
  return interference;
}

void main() {
  vec3 normalNoise = vec3(
    snoise(vPosition * 4.0 + uTime * 0.08),
    snoise(vPosition * 4.0 + 100.0 + uTime * 0.08),
    snoise(vPosition * 4.0 + 200.0 + uTime * 0.08)
  ) * 0.05;

  vec3 normal = normalize(vNormal + normalNoise);
  vec3 viewDir = normalize(vViewPosition);
  
  float fresnelPower = 4.0;
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), fresnelPower);
  
  float thicknessNoise1 = snoise(vPosition * 1.5 + uTime * 0.08);
  float thicknessNoise2 = snoise(vPosition * 3.5 + uTime * 0.15);
  float thicknessNoise3 = snoise(vPosition * 7.0 - uTime * 0.05);
  
  float thicknessVariation = (thicknessNoise1 * 0.5 + thicknessNoise2 * 0.3 + thicknessNoise3 * 0.2) * 0.5 + 0.5;
  
  float filmThickness = 250.0 + thicknessVariation * 600.0;
  
  float cosTheta = abs(dot(viewDir, normal));
  vec3 interference = thinFilmInterference(cosTheta, filmThickness);
  
  vec3 baseIridescenceColor = mix(
    mix(uColorBlue, uColorPink, interference.r),
    mix(uColorPink, uColorBlue, interference.g),
    interference.b
  );
  
  vec3 iridescenceColor = mix(baseIridescenceColor, uColorExcited, uExcitement);
  
  float colorSpread = pow(fresnel, 1.2);
  vec3 surfaceColor = iridescenceColor * (0.3 + colorSpread * 1.2);
  
  float softHighlight = pow(fresnel, 4.0) * (0.15 + uExcitement * 0.4);
  vec3 highlightColor = vec3(1.0) * softHighlight;
  
  vec3 reflectDir = reflect(-viewDir, normal);
  vec2 envUV = vec2(
    atan(reflectDir.x, reflectDir.z) / 6.283185 + 0.5,
    asin(reflectDir.y) / 3.141593 + 0.5
  );
  vec3 envReflection = texture2D(uEnvMap, envUV).rgb * fresnel * 0.3;
  
  vec3 refractDir = refract(-viewDir, normal, 1.0 / 1.33); 
  vec2 refractUV = vec2(
    atan(refractDir.x, refractDir.z) / 6.283185 + 0.5,
    asin(refractDir.y) / 3.141593 + 0.5
  );
  vec3 envRefraction = texture2D(uEnvMap, refractUV).rgb * (1.0 - fresnel) * 0.25;

  vec3 finalColor = surfaceColor + highlightColor + envReflection + envRefraction;
  
  finalColor = pow(finalColor, vec3(0.55));
  
  float alpha = 0.35 + fresnel * 0.55;
  
  gl_FragColor = vec4(finalColor, alpha);
}