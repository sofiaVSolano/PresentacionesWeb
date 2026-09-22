/** Máximo de regiones que admite la máscara de resaltado (uMask) */
export const MAX_REGIONS = 32

/** Barrido del escaneo de entrada: de la nuca a la frente (de arriba abajo en pantalla) */
const scanChunk = /* glsl */ `
  float scanZ = mix(-1.25, 1.2, uIntro);
  float revealed = step(p.z, scanZ);
  float band = smoothstep(0.16, 0.0, abs(p.z - scanZ)) * (1.0 - step(0.999, uIntro));
`

export const brainLineVertexShader = /* glsl */ `
  #define MAX_REGIONS ${MAX_REGIONS}
  uniform float uTime;
  uniform float uMask[MAX_REGIONS];
  uniform float uHasActive;
  uniform vec3 uActiveCenter;
  uniform float uEffect;
  uniform float uIntro;
  uniform float uWidth;
  uniform vec2 uResolution;

  attribute vec3 aEnd;
  attribute vec3 aNormal;
  attribute float aEdge;
  attribute float aRegion;
  attribute float aSeed;
  attribute float aSide;
  attribute float aKind;

  varying float vGlow;
  varying float vAlpha;
  varying float vSide;
  varying float vEdge;
  varying float vKind;

  float maskOf(float region) {
    if (region < -0.5) return 0.0;
    return uMask[int(region + 0.5)];
  }

  void main() {
    vec3 p = position;
    vec3 q = aEnd;
    bool hasActive = uHasActive > 0.5;
    float isActive = maskOf(aRegion);

    // la región activa late
    float pulse = 0.5 + 0.5 * sin(uTime * 3.2 + aSeed * 6.2831);
    float glow = isActive * (0.65 + 0.35 * pulse);

    if (hasActive) {
      float d = distance(p, uActiveCenter);
      if (uEffect > 0.5 && uEffect < 1.5) {
        // ondas: recorren todo el cerebro partiendo de la región elegida
        float w = fract(d * 1.4 - uTime * 0.7);
        glow = max(glow, smoothstep(0.86, 1.0, w) * 0.75 * (1.0 - smoothstep(1.6, 2.4, d)));
      } else if (uEffect > 1.5) {
        // red: otras regiones responden por turnos, como señales entre áreas
        float flick = step(0.82, fract(sin(aRegion * 12.9898 + floor(uTime * 5.0)) * 43758.5453));
        glow = max(glow, flick * 0.55 * step(-0.5, aRegion));
      }
    }

    ${scanChunk}
    glow = max(glow, band);

    // la región activa se "infla" un poco hacia fuera
    p += aNormal * isActive * 0.045;
    q += aNormal * isActive * 0.045;

    // Cinta en espacio de pantalla: los dos extremos se proyectan y el vértice se separa
    // en perpendicular al trazo, así la línea tiene grosor real (gl.LINES es de 1 px).
    vec4 cp = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vec4 cq = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
    vec2 sp = cp.xy / cp.w * uResolution * 0.5;
    vec2 sq = cq.xy / cq.w * uResolution * 0.5;
    vec2 dir = sq - sp;
    dir = length(dir) < 1e-5 ? vec2(1.0, 0.0) : normalize(dir);
    vec2 normal = vec2(-dir.y, dir.x);

    float kindWidth = aKind > 1.5 ? 0.7 : (aKind > 0.5 ? 1.35 : 1.0);
    float width = uWidth * kindWidth * (1.0 + glow * 0.9);
    float side = sign(aEdge);
    // en el extremo B la dirección mira hacia A: se invierte para que la cinta no se cruce
    float flip = abs(aEdge) > 1.5 ? -1.0 : 1.0;
    vec2 offset = normal * side * flip * width * 0.5;
    cp.xy += offset / (uResolution * 0.5) * cp.w;
    gl_Position = cp;

    // luz de borde: los trazos del contorno brillan más, dan volumen
    vec3 nView = normalize(normalMatrix * aNormal);
    float rim = pow(1.0 - clamp(abs(nView.z), 0.0, 1.0), 2.0);

    // el brillo ondula a lo largo de cada surco (depende de la posición, no del segmento)
    float twinkle = 0.8 + 0.2 * sin(uTime * 1.6 + p.x * 9.0 + p.z * 7.0);
    float kindAlpha = aKind > 1.5 ? 0.55 : (aKind > 0.5 ? 1.0 : 0.85);
    float dim = hasActive ? (isActive > 0.5 ? 1.0 : 0.35) : 1.0;

    vGlow = glow;
    vSide = aSide;
    vEdge = side;
    vKind = aKind;
    vAlpha = revealed * dim * kindAlpha * (0.7 + 0.3 * rim) * twinkle;
  }
`

export const brainLineFragmentShader = /* glsl */ `
  uniform vec3 uColorLeft;
  uniform vec3 uColorRight;
  uniform vec3 uColorCore;

  varying float vGlow;
  varying float vAlpha;
  varying float vSide;
  varying float vEdge;
  varying float vKind;

  void main() {
    // borde suave a lo ancho de la cinta: núcleo brillante y halo
    float across = abs(vEdge);
    float core = smoothstep(1.0, 0.35, across);
    vec3 base = vSide < -0.5 ? uColorLeft : (vSide > 0.5 ? uColorRight : mix(uColorLeft, uColorRight, 0.5));
    // los surcos principales tiran al crema: se leen como la estructura del cerebro
    base = mix(base, uColorCore, vKind > 0.5 && vKind < 1.5 ? 0.55 : 0.3);
    vec3 color = mix(base, uColorCore, clamp(vGlow, 0.0, 1.0) * core);
    gl_FragColor = vec4(color, min(1.0, core * vAlpha * (1.25 + vGlow)));
  }
`

export const brainHullVertexShader = /* glsl */ `
  uniform float uIntro;

  attribute float aPart;

  varying float vRevealed;
  varying vec3 vLocal;
  varying float vPart;

  void main() {
    vec3 p = position;
    ${scanChunk}
    vRevealed = revealed;
    vLocal = p;
    vPart = aPart;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

/**
 * Casco: tapa los trazos de la cara oculta (el cerebro se lee sólido) y pinta la región
 * seleccionada. La región se decide por píxel con los mismos anclajes que el hover
 * (el más cercano del mismo hemisferio), así el color coincide con lo que se ilumina.
 * Fuera de la región la salida es transparente: sólo queda la profundidad.
 */
export const brainHullFragmentShader = /* glsl */ `
  #define MAX_REGIONS ${MAX_REGIONS}
  uniform vec3 uAnchors[MAX_REGIONS];
  uniform float uMask[MAX_REGIONS];
  uniform int uLeft;
  uniform int uCount;
  uniform float uTime;
  uniform vec3 uColorLeft;
  uniform vec3 uColorRight;
  uniform vec3 uColorCore;

  varying float vRevealed;
  varying vec3 vLocal;
  varying float vPart;

  void main() {
    if (vRevealed < 0.5) discard;
    if (vPart > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    bool isLeft = vLocal.x < 0.0;
    float best = 1e5;
    float second = 1e5;
    float mask = 0.0;
    for (int k = 0; k < MAX_REGIONS; k++) {
      if (k >= uCount) break;
      if ((k < uLeft) != isLeft) continue;
      float d = distance(vLocal, uAnchors[k]);
      if (d < best) {
        second = best;
        best = d;
        mask = uMask[k];
      } else if (d < second) {
        second = d;
      }
    }

    // borde de la región: donde la distancia al segundo anclaje casi iguala a la del primero
    float border = 1.0 - smoothstep(0.0, 0.035, second - best);
    float pulse = 0.5 + 0.5 * sin(uTime * 3.2);
    vec3 base = isLeft ? uColorLeft : uColorRight;
    vec3 color = mix(base, uColorCore, border * 0.6);
    float alpha = mask * (0.3 + 0.15 * pulse + border * 0.7);
    gl_FragColor = vec4(color, alpha);
  }
`
