import * as THREE from 'three';
import { CONFIG } from '../config';

const VERTEX = /* glsl */ `
attribute float aType;
attribute float aDamage;
attribute float aStage;
attribute vec3 aPaint;
attribute float aPainted;

varying vec2 vUv;
varying vec3 vNormal;
varying float vType;
varying float vDamage;
varying float vStage;
varying vec3 vPaint;
varying float vPainted;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vType = aType;
  vDamage = aDamage;
  vStage = aStage;
  vPaint = aPaint;
  vPainted = aPainted;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uCrackAtlas;
uniform float uCrackStages;
uniform vec3 uMarbleColor;
uniform vec3 uSculptureColor;
uniform vec3 uSculptureMid;
uniform vec3 uSculptureRuined;
uniform vec3 uLightDir;
uniform float uHasAtlas;
uniform float uRevealPaint;
uniform sampler2D uMarbleMap;
uniform float uHasMarbleMap;
uniform float uMarbleScale;

varying vec2 vUv;
varying vec3 vNormal;
varying float vType;
varying float vDamage;
varying float vStage;
varying vec3 vPaint;
varying float vPainted;
varying vec3 vWorldPos;

vec2 marbleUv(vec3 pos, vec3 normal) {
  vec3 n = abs(normal);
  if (n.y >= n.x && n.y >= n.z) return pos.xz;
  if (n.x >= n.z) return pos.zy;
  return pos.xy;
}

void main() {
  vec3 base;
  if (vType > 1.5) {
    if (uRevealPaint > 0.5 && vPainted > 0.5) {
      // цвет из .vox остаётся, урон — краснота и затемнение поверх него
      float d = clamp(vDamage, 0.0, 1.0);
      base = mix(vPaint, uSculptureRuined, d * 0.72);
      base *= mix(1.0, 0.62, d);
    } else {
      vec3 c = mix(uSculptureColor, uSculptureMid, clamp(vDamage * 2.0, 0.0, 1.0));
      base = mix(c, uSculptureRuined, clamp((vDamage - 0.5) * 2.0, 0.0, 1.0));
    }
  } else if (uHasMarbleMap > 0.5) {
    base = texture2D(uMarbleMap, marbleUv(vWorldPos, vNormal) * uMarbleScale).rgb;
  } else {
    base = uMarbleColor;
  }

  if (uHasAtlas > 0.5 && vStage >= 0.0) {
    float u = (vUv.x + vStage) / uCrackStages;
    float crack = texture2D(uCrackAtlas, vec2(u, vUv.y)).r;
    base *= mix(1.0, 0.2, crack);
  }

  float ndl = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(base * (0.45 + 0.55 * ndl), 1.0);

  #include <colorspace_fragment>
}
`;

export function createVoxelMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uCrackAtlas: { value: null },
      uCrackStages: { value: CONFIG.chisel.crackStages },
      uMarbleColor: { value: new THREE.Color(CONFIG.colors.marble) },
      uSculptureColor: { value: new THREE.Color(CONFIG.colors.sculpture) },
      uSculptureMid: { value: new THREE.Color(CONFIG.colors.sculptureMid) },
      uSculptureRuined: { value: new THREE.Color(CONFIG.colors.sculptureRuined) },
      uLightDir: { value: new THREE.Vector3(0.6, 1.0, 0.45).normalize() },
      uHasAtlas: { value: 0 },
      uRevealPaint: { value: 0 },
      uMarbleMap: { value: null },
      uHasMarbleMap: { value: 0 },
      // повтор на мировой единице: глыба — один камень, не плитка на клетку
      uMarbleScale: { value: 1 },
    },
  });
}
