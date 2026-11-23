(function () {
  if (typeof window.THREE === 'undefined') return;
  const THREE = window.THREE;

  const canvas = document.getElementById('stage');
  const wrap = document.getElementById('wrap');
  if (!canvas || !wrap) return;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.4, 7.2);
  camera.lookAt(0, 0, 0);

  function resize() {
    const w = wrap.clientWidth || 1;
    const h = wrap.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const CYAN = 0x00e5ff;
  const CYAN_DIM = 0x0aa3c2;
  const VIOLET = 0x7f5af0;

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Particles
  (function particles() {
    const count = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4.2 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: CYAN,
      size: 0.028,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    scene.userData.dust = pts;
  })();

  // Hex prism
  function hexPoints(radius) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    pts.push(pts[0].clone());
    return pts;
  }

  const hexGroup = new THREE.Group();
  rootGroup.add(hexGroup);

  [1.9, -1.9].forEach(function (z, idx) {
    const pts = hexPoints(1.9);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: idx === 0 ? CYAN : CYAN_DIM,
      transparent: true,
      opacity: idx === 0 ? 0.95 : 0.35
    });
    const line = new THREE.Line(geo, mat);
    line.position.z = z * 0.45;
    hexGroup.add(line);
  });

  // Struts
  {
    const frontPts = hexPoints(1.9);
    const strutMat = new THREE.LineBasicMaterial({ color: CYAN_DIM, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 6; i++) {
      const p = frontPts[i];
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p.x, p.y, 0.855),
        new THREE.Vector3(p.x, p.y, -0.855)
      ]);
      hexGroup.add(new THREE.Line(g, strutMat));
    }
  }

  // Core
  const coreGroup = new THREE.Group();
  rootGroup.add(coreGroup);

  const icoGeo = new THREE.IcosahedronGeometry(1.05, 1);
  const posAttr = icoGeo.attributes.position;
  const uniqueVerts = [];
  const seen = new Set();
  for (let i = 0; i < posAttr.count; i++) {
    const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    const key = v.x.toFixed(3) + ',' + v.y.toFixed(3) + ',' + v.z.toFixed(3);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVerts.push(v);
    }
  }

  const wireGeo = new THREE.WireframeGeometry(icoGeo);
  const wireMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.55 });
  const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
  coreGroup.add(wireMesh);

  const nodeGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const nodes = [];
  uniqueVerts.forEach(function (v) {
    const m = new THREE.Mesh(nodeGeo, nodeMat.clone());
    m.position.copy(v);
    coreGroup.add(m);
    nodes.push(m);
  });

  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 24),
    new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  coreGroup.add(innerGlow);

  const innerGlow2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  coreGroup.add(innerGlow2);

  // Blockchain Ring
  const ringGroup = new THREE.Group();
  rootGroup.add(ringGroup);

  const blockCount = 8;
  const ringRadius = 2.55;
  const blockNodes = [];
  const blockGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  for (let i = 0; i < blockCount; i++) {
    const a = (Math.PI * 2 / blockCount) * i;
    const edgesMat = new THREE.LineBasicMaterial({
      color: i % 2 === 0 ? CYAN : VIOLET,
      transparent: true,
      opacity: 0.9
    });
    const edges = new THREE.EdgesGeometry(blockGeo);
    const blockMesh = new THREE.LineSegments(edges, edgesMat);
    blockMesh.position.set(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius * 0.42, Math.sin(a * 2) * 0.35);
    ringGroup.add(blockMesh);
    blockNodes.push(blockMesh);
  }

  const orbitPts = [];
  const segs = 128;
  for (let i = 0; i <= segs; i++) {
    const a = (Math.PI * 2 / segs) * i;
    orbitPts.push(new THREE.Vector3(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius * 0.42, Math.sin(a * 2) * 0.35));
  }
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  const orbitMat = new THREE.LineBasicMaterial({ color: CYAN_DIM, transparent: true, opacity: 0.25 });
  ringGroup.add(new THREE.Line(orbitGeo, orbitMat));

  const pulseCount = 5;
  const pulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.05, 8, 8);
  for (let i = 0; i < pulseCount; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const m = new THREE.Mesh(pulseGeo, mat);
    ringGroup.add(m);
    pulses.push({ mesh: m, t: i / pulseCount });
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const pl = new THREE.PointLight(0x00e5ff, 1.2, 20);
  pl.position.set(2, 2, 4);
  scene.add(pl);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    hexGroup.rotation.y = t * 1.6;
    hexGroup.rotation.x = Math.sin(t * 0.8) * 0.12;

    coreGroup.rotation.y = -t * 2.8;
    coreGroup.rotation.x = t * 1.1;

    nodes.forEach(function (n, i) {
      const s = 1 + 0.4 * Math.sin(t * 12.0 + i * 0.7);
      n.scale.setScalar(s);
    });
    innerGlow.material.opacity = 0.16 + 0.1 * Math.sin(t * 8.0);
    innerGlow2.material.opacity = 0.4 + 0.3 * Math.sin(t * 10.0);

    ringGroup.rotation.y = t * 1.8;
    blockNodes.forEach(function (b) {
      b.rotation.x += 0.08;
      b.rotation.y += 0.11;
    });

    pulses.forEach(function (p) {
      p.t += 0.022;
      if (p.t > 1) p.t -= 1;
      const a = p.t * Math.PI * 2;
      p.mesh.position.set(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius * 0.42, Math.sin(a * 2) * 0.35);
    });

    rootGroup.rotation.y = Math.sin(t * 0.52) * 0.05;
    scene.userData.dust.rotation.y = t * 0.11;

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
})();
