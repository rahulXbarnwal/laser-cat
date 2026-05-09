import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ============================================================
// Renderer + scene
// ============================================================
const canvas = document.getElementById("scene");
const laser = document.getElementById("laser");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f1ea);

const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.55, 5.4);
camera.lookAt(0, 1.0, 0);

// ============================================================
// Studio lighting — key / fill / rim
// ============================================================
scene.add(new THREE.HemisphereLight(0xffffff, 0xddccaa, 0.55));

const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3;
key.shadow.camera.right = 3;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -3;
key.shadow.bias = -0.0005;
scene.add(key);

const fill = new THREE.DirectionalLight(0xffe2c8, 0.5);
fill.position.set(-4, 2, 2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xc8d8ff, 0.7);
rim.position.set(0, 4, -3);
scene.add(rim);

// Floor
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 64),
  new THREE.MeshStandardMaterial({ color: 0xeae5dc, roughness: 0.95 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ============================================================
// Cat — primitive placeholder rig in a sitting pose.
// All bone refs live on `rig` so loadRealCat() can swap them out
// when a real .glb arrives without touching the animation loop.
// ============================================================
const rig = {
  body: null,
  headPivot: null,
  leftEye: null,
  rightEye: null,
  leftEar: null,
  rightEar: null,
  tailPivot: null,
  torso: null, // for breathing
};
const FUR = 0x8a6f56;
const FUR_DARK = 0x4a3826;
const BELLY = 0xe8d4b6;
const PINK = 0xe8a89a;
const fur = (c, r = 0.85) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r });

const cat = new THREE.Group();
scene.add(cat);

// ----- Body (haunches + torso, in a "sitting" silhouette) -----
const body = new THREE.Group();
cat.add(body);
rig.body = body;

const haunches = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), fur(FUR));
haunches.scale.set(1.05, 1.0, 1.1);
haunches.position.set(0, 0.5, -0.1);
haunches.castShadow = true;
body.add(haunches);

const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), fur(FUR));
torso.scale.set(0.95, 1.05, 0.85);
torso.position.set(0, 0.95, 0.2);
torso.castShadow = true;
body.add(torso);
rig.torso = torso;

const chestFur = new THREE.Mesh(
  new THREE.SphereGeometry(0.32, 24, 24),
  fur(BELLY),
);
chestFur.scale.set(0.7, 1.1, 0.6);
chestFur.position.set(0, 0.85, 0.4);
body.add(chestFur);

// Front legs (vertical, paws on floor)
function makeFrontLeg(side) {
  const leg = new THREE.Group();

  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.7, 16),
    fur(FUR),
  );
  upper.position.y = 0.35;
  upper.castShadow = true;
  leg.add(upper);

  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), fur(FUR));
  paw.scale.set(1.1, 0.55, 1.5);
  paw.position.y = 0.05;
  paw.position.z = 0.05;
  paw.castShadow = true;
  leg.add(paw);

  leg.position.set(0.22 * side, 0, 0.5);
  return leg;
}
body.add(makeFrontLeg(-1));
body.add(makeFrontLeg(1));

// Tabby stripes on torso
function torsoStripe(angle) {
  const s = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.018, 6, 14, Math.PI * 0.5),
    fur(FUR_DARK),
  );
  s.rotation.x = Math.PI / 2;
  s.rotation.z = angle;
  s.position.set(0, 1.0, 0.2);
  body.add(s);
}
torsoStripe(0.4);
torsoStripe(0.0);
torsoStripe(-0.4);

// ----- Head pivot — sits forward of torso so it tracks naturally -----
const headPivot = new THREE.Object3D();
headPivot.position.set(0, 1.35, 0.32);
cat.add(headPivot);
rig.headPivot = headPivot;

// Head: broader at brow, narrower at chin
const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), fur(FUR));
head.scale.set(1.1, 0.95, 1.0);
head.castShadow = true;
headPivot.add(head);

// Forehead stripes (tabby M-mark)
function brow(x, rotZ) {
  const s = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.16, 0.02),
    fur(FUR_DARK),
  );
  s.position.set(x, 0.22, 0.18);
  s.rotation.z = rotZ;
  headPivot.add(s);
}
brow(0.0, 0.0);
brow(0.1, 0.5);
brow(-0.1, -0.5);

// Snout / muzzle
const muzzle = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 24),
  fur(0xc8a98a),
);
muzzle.scale.set(1.15, 0.7, 1.0);
muzzle.position.set(0, -0.1, 0.3);
headPivot.add(muzzle);

// Nose (pink triangle-ish)
const nose = new THREE.Mesh(
  new THREE.SphereGeometry(0.045, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xc66b6b, roughness: 0.5 }),
);
nose.scale.set(1.2, 0.8, 0.8);
nose.position.set(0, -0.04, 0.45);
headPivot.add(nose);

// Mouth line
const mouth = new THREE.Mesh(
  new THREE.BoxGeometry(0.08, 0.012, 0.012),
  fur(FUR_DARK),
);
mouth.position.set(0, -0.18, 0.42);
headPivot.add(mouth);

// ----- Ears -----
function makeEar(side) {
  const earPivot = new THREE.Object3D();
  earPivot.position.set(0.21 * side, 0.27, -0.02);
  earPivot.rotation.z = -0.22 * side;

  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.3, 16),
    fur(FUR),
  );
  outer.castShadow = true;
  outer.position.y = 0.15;
  earPivot.add(outer);

  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.2, 16),
    fur(PINK, 0.6),
  );
  inner.position.set(0, 0.13, 0.025);
  earPivot.add(inner);

  return earPivot;
}
const leftEar = makeEar(-1);
const rightEar = makeEar(1);
headPivot.add(leftEar);
headPivot.add(rightEar);
rig.leftEar = leftEar;
rig.rightEar = rightEar;

// ----- Eyes — pushed forward, large enough to read at viewport scale -----
function makeEye(side) {
  const eye = new THREE.Object3D();
  // Push eyes well outside the head sphere so iris/pupil aren't z-fought
  eye.position.set(0.13 * side, 0.06, 0.42);

  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xfff4d8, roughness: 0.25 }),
  );
  eye.add(sclera);

  const iris = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x86c97a,
      roughness: 0.2,
      emissive: 0x2a4a22,
      emissiveIntensity: 0.35,
    }),
  );
  iris.position.z = 0.025;
  eye.add(iris);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05 }),
  );
  pupil.scale.set(0.55, 1.0, 0.55); // vertical slit
  pupil.position.z = 0.06;
  eye.add(pupil);

  // Small specular highlight dot
  const glint = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  glint.position.set(-0.018, 0.018, 0.085);
  eye.add(glint);

  return eye;
}
const leftEye = makeEye(-1);
const rightEye = makeEye(1);
headPivot.add(leftEye);
headPivot.add(rightEye);
rig.leftEye = leftEye;
rig.rightEye = rightEye;

// ----- Whiskers -----
function whisker(side, y, angle) {
  const mat = new THREE.LineBasicMaterial({ color: 0xf0e6d2, transparent: true, opacity: 0.9 });
  const len = 0.32;
  const start = new THREE.Vector3(0.08 * side, y, 0.42);
  const end = new THREE.Vector3(
    start.x + Math.cos(angle) * len * side,
    start.y + Math.sin(angle) * len * 0.4,
    start.z + 0.02,
  );
  const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
  const line = new THREE.Line(geom, mat);
  headPivot.add(line);
}
[-0.05, -0.1, -0.15].forEach((y, i) => {
  whisker(-1, y, 0.2 - i * 0.15);
  whisker(1, y, 0.2 - i * 0.15);
});

// ----- Tail -----
const tailPivot = new THREE.Object3D();
tailPivot.position.set(0, 0.6, -0.55);
tailPivot.rotation.x = -0.6;
cat.add(tailPivot);
rig.tailPivot = tailPivot;

const tail = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.1, 1.1, 12),
  fur(FUR),
);
tail.position.y = 0.55;
tail.castShadow = true;
tailPivot.add(tail);

const tailTip = new THREE.Mesh(
  new THREE.SphereGeometry(0.075, 16, 16),
  fur(FUR_DARK),
);
tailTip.position.y = 1.1;
tailPivot.add(tailTip);

// ============================================================
// Cursor → world-space target
// ============================================================
const laserPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const mouseRaw = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let lastMoveT = performance.now();
let mouseSpeed = 0;

window.addEventListener("mousemove", (e) => {
  const now = performance.now();
  const dt = Math.max(1, now - lastMoveT);
  const dx = e.clientX - mouseRaw.x;
  const dy = e.clientY - mouseRaw.y;
  const inst = Math.sqrt(dx * dx + dy * dy) / dt;
  mouseSpeed = mouseSpeed * 0.8 + inst * 0.2;
  lastMoveT = now;
  mouseRaw.x = e.clientX;
  mouseRaw.y = e.clientY;
});

const mouseNDC = new THREE.Vector2();
const trackingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.2);
const raycaster = new THREE.Raycaster();
const targetWorld = new THREE.Vector3(0, 1.1, 2.2);

// ============================================================
// Bone-rotation math
// Three.js lookAt orients an object's -Z toward the target (camera
// convention). Our cat's snout / eye fronts point +Z, so we flip
// 180° around Y after computing lookAt.
// ============================================================
const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3();
const parentQ = new THREE.Quaternion();
const baseQ = new THREE.Quaternion();
const upVec = new THREE.Vector3(0, 1, 0);
const flipY = new THREE.Quaternion(0, 1, 0, 0); // 180° around Y

function lookAtBone(obj, target, slerpFactor, maxAngle = Infinity) {
  obj.getWorldPosition(tmpV);
  tmpM.lookAt(tmpV, target, upVec);
  tmpQ.setFromRotationMatrix(tmpM);
  tmpQ.multiply(flipY); // make +Z (snout) face target

  if (obj.parent) {
    obj.parent.getWorldQuaternion(parentQ).invert();
    tmpQ.premultiply(parentQ);
  }

  if (maxAngle !== Infinity) {
    baseQ.identity();
    const angle = baseQ.angleTo(tmpQ);
    if (angle > maxAngle) {
      tmpQ.slerpQuaternions(baseQ, tmpQ, maxAngle / angle);
    }
  }

  obj.quaternion.slerp(tmpQ, slerpFactor);
}

// ============================================================
// Animation loop
// ============================================================
const clock = new THREE.Clock();
let earTwitchL = 0;
let earTwitchR = 0;

function animate() {
  const t = clock.getElapsedTime();

  // Laser dot wobble
  const wobble = 1.4;
  laserPos.x = mouseRaw.x + (Math.random() - 0.5) * wobble;
  laserPos.y = mouseRaw.y + (Math.random() - 0.5) * wobble;
  laser.style.left = laserPos.x + "px";
  laser.style.top = laserPos.y + "px";

  mouseNDC.x = (laserPos.x / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(laserPos.y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(trackingPlane, targetWorld);

  // Eyes — fast saccade
  if (rig.leftEye) lookAtBone(rig.leftEye, targetWorld, 0.6);
  if (rig.rightEye) lookAtBone(rig.rightEye, targetWorld, 0.6);

  // Head — slower, clamped to ~55°
  if (rig.headPivot) lookAtBone(rig.headPivot, targetWorld, 0.13, Math.PI / 3.2);

  // Body lean — gentle yaw + roll based on cursor x
  if (rig.body) {
    const targetBodyY = mouseNDC.x * 0.16;
    const targetBodyZ = -mouseNDC.x * 0.04;
    rig.body.rotation.y += (targetBodyY - rig.body.rotation.y) * 0.04;
    rig.body.rotation.z += (targetBodyZ - rig.body.rotation.z) * 0.04;
  }

  // Breathing — placeholder torso only; real models breathe via spine bone
  if (rig.torso) {
    const breath = Math.sin(t * 1.6) * 0.02;
    rig.torso.scale.set(0.95 + breath, 1.05 + breath * 0.6, 0.85 + breath);
  }

  // Ears — idle wobble + speed-driven flicks
  const speedKick = Math.min(mouseSpeed, 4);
  if (Math.random() < speedKick * 0.004) earTwitchL = 0.4;
  if (Math.random() < speedKick * 0.004) earTwitchR = 0.4;
  earTwitchL *= 0.92;
  earTwitchR *= 0.92;
  if (rig.leftEar) {
    rig.leftEar.rotation.z = -0.22 + Math.sin(t * 7.0) * 0.02 - earTwitchL * 0.2;
  }
  if (rig.rightEar) {
    rig.rightEar.rotation.z = 0.22 - Math.sin(t * 7.1 + 1.0) * 0.02 + earTwitchR * 0.2;
  }

  // Tail — slow sway, faster flicks when cursor is moving
  if (rig.tailPivot) {
    const flick = Math.sin(t * (2.0 + mouseSpeed * 1.2));
    rig.tailPivot.rotation.z = flick * (0.2 + mouseSpeed * 0.05);
    rig.tailPivot.rotation.y = Math.sin(t * 1.3) * 0.18;
  }

  mouseSpeed *= 0.96;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ============================================================
// Resize
// ============================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// Load a real cat model.
//
// Drop your .glb at ./assets/cat.glb. Then either:
//   - hard-refresh the page (model auto-loads — see bottom of file), or
//   - run window.loadRealCat() from the browser console.
//
// The loader will:
//   - replace the placeholder cat
//   - auto-fit the model to ~1.8 units tall
//   - search for bones by common naming conventions and rebind rig.*
//   - log the full bone tree so you can tell me what's there
// ============================================================
function findByPattern(root, ...patterns) {
  for (const p of patterns) {
    const re = new RegExp(p, "i");
    let found = null;
    root.traverse((o) => {
      if (!found && o.name && re.test(o.name)) found = o;
    });
    if (found) return found;
  }
  return null;
}

window.loadRealCat = function (url = "./assets/cat.glb", opts = {}) {
  new GLTFLoader().load(
    url,
    (gltf) => {
      const real = gltf.scene;

      real.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      // Auto-fit: scale to a target height, sit on the floor, center XZ
      const box = new THREE.Box3().setFromObject(real);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const targetHeight = opts.height ?? 1.8;
      const scale = targetHeight / size.y;
      real.scale.setScalar(scale);
      real.position.set(
        -center.x * scale,
        -box.min.y * scale,
        -center.z * scale,
      );

      // Swap into scene
      scene.remove(cat);
      scene.add(real);

      // Bone discovery — broad name patterns to cover Meshy, Tripo,
      // Mixamo, Blender autoset, ManuelLab, etc.
      const found = {
        head: findByPattern(real, "^head", "skull", "neck.?03", "cabeza"),
        leftEye: findByPattern(real, "lefteye", "eye.?l\\b", "eye_left", "l.?eye", "ojo.?izq"),
        rightEye: findByPattern(real, "righteye", "eye.?r\\b", "eye_right", "r.?eye", "ojo.?der"),
        leftEar: findByPattern(real, "leftear", "ear.?l\\b", "l.?ear"),
        rightEar: findByPattern(real, "rightear", "ear.?r\\b", "r.?ear"),
        tail: findByPattern(real, "tail", "cola"),
        body: findByPattern(real, "spine", "chest", "torso", "^body\\b"),
      };

      // Reset placeholder-specific refs that don't exist on real model
      rig.torso = null;

      if (found.head) rig.headPivot = found.head;
      else rig.headPivot = real; // fallback: rotate the whole thing
      if (found.leftEye) rig.leftEye = found.leftEye;
      else rig.leftEye = null;
      if (found.rightEye) rig.rightEye = found.rightEye;
      else rig.rightEye = null;
      if (found.leftEar) rig.leftEar = found.leftEar;
      else rig.leftEar = null;
      if (found.rightEar) rig.rightEar = found.rightEar;
      else rig.rightEar = null;
      if (found.tail) rig.tailPivot = found.tail;
      else rig.tailPivot = null;
      rig.body = found.body || real;

      console.log("Cat model loaded. Bones bound:");
      Object.entries(found).forEach(([k, v]) => {
        console.log(`  ${k.padEnd(8)}: ${v ? v.name : "(none — that motion will be skipped)"}`);
      });

      console.log("\nFull node tree (paste this back to me if tracking misbehaves):");
      const tree = [];
      real.traverse((o) => {
        const depth = (() => {
          let d = 0, p = o.parent;
          while (p && p !== real) { d++; p = p.parent; }
          return d;
        })();
        tree.push("  ".repeat(depth) + (o.isBone ? "[bone] " : "") + (o.name || "(unnamed)") + " — " + o.type);
      });
      console.log(tree.join("\n"));
    },
    undefined,
    (err) => {
      console.error("Failed to load cat model from", url, err);
      console.error("Make sure the file exists at /assets/cat.glb under your web server root.");
    },
  );
};

// Auto-attempt: try to load a real cat on startup. Silent if the file
// isn't there — the placeholder stays.
fetch("./assets/cat.glb", { method: "HEAD" })
  .then((r) => {
    if (r.ok) {
      console.log("Found assets/cat.glb — loading real model.");
      window.loadRealCat();
    }
  })
  .catch(() => {});

// ============================================================
// Photo-rig mode
// ------------------------------------------------------------
// Activates automatically if assets/cat.jpg (or .png/.webp) is
// present. Hides the 3D scene and renders the photo with subtle
// parallax motion + optional pupil overlays for eye tracking.
//
// To tune the eye positions for your photo, open the console:
//   tunePhotoRig({
//     leftEye:  { x: 47, y: 40, r: 3 },  // x,y,r as % of photo
//     rightEye: { x: 56, y: 40, r: 3 },
//     enable: true                       // turn pupil overlays on
//   })
// ============================================================
const PHOTO_CANDIDATES = ["./assets/cat.jpg", "./assets/cat.png", "./assets/cat.webp"];

(async function tryPhotoRig() {
  let url = null;
  for (const u of PHOTO_CANDIDATES) {
    const ok = await fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
    if (ok) { url = u; break; }
  }
  if (!url) {
    console.log(
      "No photo at assets/cat.{jpg,png,webp}. Drop one in to switch to photo-rig mode.",
    );
    return;
  }
  console.log("Photo-rig mode: loading", url);
  initPhotoRig(url);
})();

function initPhotoRig(photoUrl) {
  // Hide the 3D scene + hint
  canvas.style.display = "none";
  const hint = document.getElementById("hint");
  if (hint) hint.remove();

  // Build DOM
  const wrap = document.createElement("div");
  wrap.id = "photo-rig";
  wrap.innerHTML = `
    <div class="cat-frame">
      <img class="cat-photo" src="${photoUrl}" alt="" draggable="false" />
      <div class="pupil pupil-l"></div>
      <div class="pupil pupil-r"></div>
    </div>
  `;
  document.body.insertBefore(wrap, document.body.firstChild);

  const frame = wrap.querySelector(".cat-frame");
  const photo = wrap.querySelector(".cat-photo");
  const pupilL = wrap.querySelector(".pupil-l");
  const pupilR = wrap.querySelector(".pupil-r");

  // Eye config — coordinates are % of the natural image dimensions.
  // x/y = pupil center, r = eye radius (defines pupil size + travel range).
  // Defaults tuned for the bundled Unsplash tabby; tune for any other photo
  // via window.tunePhotoRig({...}) in the console.
  const cfg = {
    leftEye: { x: 50.5, y: 47, r: 1.6 },
    rightEye: { x: 60.5, y: 47, r: 1.6 },
    enable: true,
    leanAmount: 0,
    rotAmount: 0,
    pupilTravel: 0.55,
    pupilWidthRatio: 0.55, // narrow horizontally for slit pupil
    pupilHeightRatio: 1.4, // tall vertically
    objectPositionX: 0.62, // matches CSS object-position: 62% ...
    objectPositionY: 0.45,
  };

  function syncObjectPosition() {
    photo.style.objectPosition =
      `${cfg.objectPositionX * 100}% ${cfg.objectPositionY * 100}%`;
  }

  window.tunePhotoRig = (next = {}) => {
    Object.assign(cfg, next);
    if (next.leftEye) Object.assign(cfg.leftEye, next.leftEye);
    if (next.rightEye) Object.assign(cfg.rightEye, next.rightEye);
    syncObjectPosition();
    placePupils();
    updatePupilVisibility();
    console.log("photo-rig config:", cfg);
  };
  syncObjectPosition();

  // Compute the rect (in viewport coords) where the underlying image
  // is actually displayed. With object-fit: cover the displayed image
  // overflows the container, so we can't use getBoundingClientRect on
  // the <img> — we have to redo the cover math ourselves.
  function getPhotoRect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nw = photo.naturalWidth;
    const nh = photo.naturalHeight;
    if (!nw || !nh) return null;
    const scale = Math.max(vw / nw, vh / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const left = (vw - dw) * cfg.objectPositionX;
    const top = (vh - dh) * cfg.objectPositionY;
    return { left, top, width: dw, height: dh };
  }

  function placePupils() {
    const r = getPhotoRect();
    if (!r) return;
    const setEye = (el, eye) => {
      el.style.left = r.left + (eye.x / 100) * r.width + "px";
      el.style.top = r.top + (eye.y / 100) * r.height + "px";
      const baseW = (eye.r / 100) * r.width;
      el.style.width = baseW * cfg.pupilWidthRatio + "px";
      el.style.height = baseW * cfg.pupilHeightRatio + "px";
    };
    setEye(pupilL, cfg.leftEye);
    setEye(pupilR, cfg.rightEye);
  }

  function updatePupilVisibility() {
    pupilL.classList.toggle("active", cfg.enable);
    pupilR.classList.toggle("active", cfg.enable);
  }

  photo.addEventListener("load", placePupils);
  window.addEventListener("resize", placePupils);
  if (photo.complete) placePupils();
  updatePupilVisibility();

  // Animation: pupil tracking only (whole-photo motion off by default)
  let smoothX = 0;
  let smoothY = 0;

  (function tick() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = Math.max(-1, Math.min(1, (mouseRaw.x - cx) / cx));
    const dy = Math.max(-1, Math.min(1, (mouseRaw.y - cy) / cy));
    smoothX += (dx - smoothX) * 0.12;
    smoothY += (dy - smoothY) * 0.12;

    if (cfg.leanAmount || cfg.rotAmount) {
      frame.style.transform =
        `translate(${smoothX * cfg.leanAmount}px, ${-smoothY * cfg.leanAmount * 0.5}px) ` +
        `rotate(${-smoothX * cfg.rotAmount}deg)`;
    }

    if (cfg.enable) {
      const r = getPhotoRect();
      if (r) {
        const travel = (cfg.leftEye.r / 100) * r.width * cfg.pupilTravel;
        const px = smoothX * travel;
        const py = smoothY * travel;
        pupilL.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
        pupilR.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
      }
    }

    requestAnimationFrame(tick);
  })();

  console.log(
    "Photo-rig active. Tune eye positions in the console:\n" +
    "  tunePhotoRig({ leftEye: {x: 50, y: 47, r: 1.6}, rightEye: {x: 60, y: 47, r: 1.6} })\n" +
    "x/y are % of the photo (0-100). r is the radius (and travel range).",
  );
}
