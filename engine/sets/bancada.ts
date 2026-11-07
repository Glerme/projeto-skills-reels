import * as THREE from "three";
import { Batch, V, lam, quad, type Kit } from "../style/build";
import { NOINK } from "../style/ink";
import { Layout } from "./layout";
import type { SetDef } from "./types";

const spots: SetDef["spots"] = {
  centro: [0, 0.32, 0], esquerda: [-3, 0, 0.3], direita: [3, 0, -0.3],
  fundo: [0, 0, -6], esquina: [4.8, 0, -14],
};
// Room furniture stands on a far ring so any 3/4 view finds soft shapes behind the plinth, never near the plates.
const RING = 14;
const around = (deg: number): [number, number] => [RING * Math.sin(deg * Math.PI / 180), -RING * Math.cos(deg * Math.PI / 180)];
const plan = (kit: Kit) => {
  const p = new Layout(kit, spots);
  for (const [name, deg, h] of [["furniture-bookcase-open", -35, 3.4], ["furniture-desk", -12, 1.4], ["furniture-chair-desk", 8, 1.5],
    ["furniture-bookcase-open", 28, 3.4], ["furniture-desk", 50, 1.4], ["furniture-chair-desk", 66, 1.5], ["furniture-bookcase-open", 84, 3.4]] as const) {
    const [x, z] = around(deg);
    p.prop(name, x, 0, z, h, -deg * Math.PI / 180);
  }
  const [qx, qz] = around(16);
  p.geometry("quadro", new THREE.BoxGeometry(2.6, 1.5, 0.12).rotateY(-16 * Math.PI / 180),
    lam("bancadaQuadro", () => ({ color: "#6d70a8", emissive: "#6d70a8", emissiveIntensity: 0.7 })), new THREE.Matrix4().makeTranslation(qx * 1.3, 3.2, qz * 1.3));
  return p;
};

export const bancada: SetDef = {
  id: "bancada", sky: false, sunAz: 160, spots, walkways: {},
  // The low central plinth is supporting terrain; centro sits on its top, not inside a furniture obstacle.
  blocked: kit => plan(kit).blocked,
  views: {
    aberto: { pos: [0, 1.12, 11], look: [0, 1.12, 0], fov: 50, roll: 0 },
    medio: { pos: [0, 0.94, 7.2], look: [0, 0.94, 0], fov: 45, roll: 0 },
    close: { pos: [0, 1.12, 3.4], look: [0, 1.12, 0], fov: 50, roll: 0 },
    baixo: { pos: [-3, 0.77, 7.4], look: [0, 0.94, 0], fov: 50, roll: 0 },
    aereo: { pos: [3.6, 6, 9], look: [0, 1.2, 0], fov: 42, roll: 0 },
  },
  build(root, kit) {
    const floor = new Batch();
    for (let x = -24; x < 24; x++) for (let z = -30; z < 24; z++) {
      const fade = Math.round(THREE.MathUtils.smoothstep(Math.hypot(x, z), 5, 22) * 8) / 8;
      const color = new THREE.Color((x + z) % 2 ? "#25284c" : "#4a4676").lerp(new THREE.Color("#141631"), fade);
      floor.add(quad(V(x, 0, z + 1), V(x + 1, 0, z + 1), V(x + 1, 0, z), V(x, 0, z)),
        lam(`bancadaTile${color.getHexString()}`, () => ({ color, emissive: color, emissiveIntensity: 0.35 })));
    }
    const ground = new THREE.Group(); floor.build(ground, false);
    ground.traverse(o => o.layers.set(NOINK)); root.add(ground);
    const b = new Batch();
    b.add(new THREE.CylinderGeometry(2.2, 2.3, 0.32, 64).translate(0, 0.16, 0),
      lam("bancadaPedestal", () => ({ color: "#465064", emissive: "#515d91", emissiveIntensity: 0.45 })));
    b.add(new THREE.TorusGeometry(2.2, 0.05, 8, 64).rotateX(Math.PI / 2).translate(0, 0.30, 0),
      lam("bancadaRim", () => ({ color: "#8eabff", emissive: "#816bff", emissiveIntensity: 2.5 })));
    // Cyclorama: navy-purple wallpaper with soft vertical stripes, darker towards the top, at the same distance from every yaw.
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 24, 96, 1, true).translate(0, 10, 0), new THREE.ShaderMaterial({
      side: THREE.BackSide, toneMapped: false, fog: false,
      vertexShader: "varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "varying vec3 p; void main(){float a=atan(p.x,p.z)*24.0/3.14159; float stripe=step(0.5,fract(a));" +
        "vec3 c=mix(vec3(0.24,0.23,0.47),vec3(0.07,0.08,0.18),smoothstep(0.0,14.0,p.y))*(0.9+0.1*stripe); gl_FragColor=vec4(c,1.0);}",
    }));
    wall.layers.set(NOINK); root.add(wall);
    // Soft halo kept on the line from the lens through the subject, far behind it, so it frames the object from any yaw.
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: "varying vec2 uv0; void main(){uv0=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "varying vec2 uv0; void main(){float a=exp(-14.0*dot(uv0-0.5,uv0-0.5)); gl_FragColor=vec4(0.62,0.66,1.0,a*0.45);}",
    }));
    const subject = V(0, 1.6, -1.5);
    halo.onBeforeRender = (_r, _s, camera) => {
      halo.position.copy(subject).addScaledVector(subject.clone().sub(camera.position).setY(0).normalize(), 9);
      halo.quaternion.copy(camera.quaternion); halo.updateMatrixWorld();
    };
    halo.frustumCulled = false; halo.layers.set(NOINK); root.add(halo);
    const muted: Kit = {};
    for (const name of ["furniture-desk", "furniture-chair-desk", "furniture-bookcase-open"]) {
      if (!kit[name]) continue;
      const model = kit[name].clone(true);
      model.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material =
        lam("bancadaFurniture", () => ({ color: "#51577e", emissive: "#51577e", emissiveIntensity: 0.6 })); });
      muted[name] = model;
    }
    const furniture = new Batch(), office = new THREE.Group();
    plan(muted).draw(furniture); furniture.build(office);
    // prop() normalizes kit materials; apply the local emissive finish after that conversion.
    office.traverse(o => {
      if (o instanceof THREE.Mesh && (o.material as THREE.MeshLambertMaterial).color.getHexString() === "51577e")
        o.material = lam("bancadaFurniture", () => ({ color: "#51577e", emissive: "#51577e", emissiveIntensity: 0.6 }));
    });
    root.add(office); b.build(root);
    const key = new THREE.SpotLight("#f3f5ff", 100, 30, Math.PI / 5, 0.8, 2);
    key.position.set(0, 6, 4); key.target.position.set(0, 1, 0);
    const fill = new THREE.PointLight("#8daaff", 35, 24, 2);
    fill.position.set(-7, 4, 2);
    root.add(key, key.target, fill);
  },
};
