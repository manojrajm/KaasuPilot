import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';

interface TeslaVault3DProps {
  size?: number;
}

export function TeslaVault3D({ size = 220 }: TeslaVault3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    // 2. Lighting System (Tesla Specular Studio)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Primary Cool Cyan Keylight
    const keyLight = new THREE.DirectionalLight(0xb0e8ff, 2.8);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    // Warm Golden Backlight
    const backLight = new THREE.DirectionalLight(0xffb800, 2.4);
    backLight.position.set(-4, -4, -3);
    scene.add(backLight);

    // Orbiting 24K Gold Specular PointLight
    const pointLight = new THREE.PointLight(0xffd700, 4.5, 12);
    pointLight.position.set(0, 2, 2.5);
    scene.add(pointLight);

    // 3. Materials
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.96,
      roughness: 0.14,
      emissive: 0x1f1500,
    });

    const goldAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe680,
      metalness: 0.98,
      roughness: 0.08,
      emissive: 0x221a00,
    });

    const titaniumMaterial = new THREE.MeshStandardMaterial({
      color: 0x18202c,
      metalness: 0.9,
      roughness: 0.22,
    });

    const emeraldCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.3,
    });

    // 4. Medallion Construction
    const medallionGroup = new THREE.Group();

    // Main Coin Cylinder
    const coinGeom = new THREE.CylinderGeometry(1.6, 1.6, 0.26, 48);
    const coinMesh = new THREE.Mesh(coinGeom, goldMaterial);
    coinMesh.rotation.x = Math.PI / 2;
    medallionGroup.add(coinMesh);

    // Outer Chamfered Rim
    const outerRimGeom = new THREE.TorusGeometry(1.6, 0.08, 16, 48);
    const outerRim = new THREE.Mesh(outerRimGeom, goldAccentMaterial);
    medallionGroup.add(outerRim);

    // Inner Concentric Bevel
    const innerRimGeom = new THREE.TorusGeometry(1.36, 0.045, 16, 48);
    const innerRim = new THREE.Mesh(innerRimGeom, goldAccentMaterial);
    medallionGroup.add(innerRim);

    // Front & Back Embossed Rupee Geometry (₹)
    const createRupeeEmboss = (zOffset: number) => {
      const g = new THREE.Group();
      g.position.z = zOffset;

      // Top bar
      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.13, 0.08),
        goldAccentMaterial
      );
      topBar.position.set(0.04, 0.5, 0);
      g.add(topBar);

      // Mid bar
      const midBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.11, 0.08),
        goldAccentMaterial
      );
      midBar.position.set(0.04, 0.2, 0);
      g.add(midBar);

      // Upper curve
      const curve = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.06, 12, 24, Math.PI),
        goldAccentMaterial
      );
      curve.rotation.z = -Math.PI / 2;
      curve.position.set(-0.06, 0.2, 0);
      g.add(curve);

      // Vertical spine
      const spine = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.05, 0.08),
        goldAccentMaterial
      );
      spine.position.set(-0.34, 0.02, 0);
      g.add(spine);

      // Diagonal leg
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.75, 0.08),
        goldAccentMaterial
      );
      leg.position.set(0.08, -0.32, 0);
      leg.rotation.z = -0.65;
      g.add(leg);

      return g;
    };

    medallionGroup.add(createRupeeEmboss(0.14));
    medallionGroup.add(createRupeeEmboss(-0.14)); // double-sided 3D

    // Center Quantum Emerald Core inside the Coin
    const coreGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.29, 24),
      emeraldCoreMaterial
    );
    coreGlow.rotation.x = Math.PI / 2;
    medallionGroup.add(coreGlow);

    scene.add(medallionGroup);

    // 5. Outer Cybertruck Titanium Orbital Rings
    const orbitalGroup = new THREE.Group();

    const ring1Geom = new THREE.TorusGeometry(2.32, 0.06, 8, 40);
    const ring1 = new THREE.Mesh(ring1Geom, titaniumMaterial);
    orbitalGroup.add(ring1);

    const ring2Geom = new THREE.TorusGeometry(2.6, 0.04, 6, 32);
    const ring2 = new THREE.Mesh(ring2Geom, titaniumMaterial);
    ring2.rotation.x = Math.PI / 4;
    orbitalGroup.add(ring2);

    scene.add(orbitalGroup);

    // 6. Inward Particle Vortex (450 Photon Sparks)
    const particleCount = 450;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);

    const colorGold = new THREE.Color(0xffd700);
    const colorEmerald = new THREE.Color(0x00e676);

    for (let p = 0; p < particleCount; p++) {
      const r = 2.2 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 1.8;

      radii[p] = r;
      angles[p] = theta;
      speeds[p] = 0.02 + Math.random() * 0.035;

      positions[p * 3] = r * Math.cos(theta);
      positions[p * 3 + 1] = r * Math.sin(theta);
      positions[p * 3 + 2] = z;

      const chosenColor = p % 2 === 0 ? colorEmerald : colorGold;
      colors[p * 3] = chosenColor.r;
      colors[p * 3 + 1] = chosenColor.g;
      colors[p * 3 + 2] = chosenColor.b;
    }

    particleGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeom, particleMaterial);
    scene.add(particleSystem);

    // 7. 60 FPS Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Medallion Smooth 3D Rotation with subtle tilt
      medallionGroup.rotation.y = elapsedTime * 1.35;
      medallionGroup.rotation.x = Math.sin(elapsedTime * 1.2) * 0.16;
      medallionGroup.rotation.z = Math.cos(elapsedTime * 0.9) * 0.08;

      // Outer Orbital Rings Counter-Rotation
      orbitalGroup.rotation.z = -elapsedTime * 0.65;
      orbitalGroup.rotation.y = elapsedTime * 0.45;
      orbitalGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.25;

      // Orbiting Specular Light
      pointLight.position.x = Math.cos(elapsedTime * 2.2) * 3.2;
      pointLight.position.y = Math.sin(elapsedTime * 2.2) * 2.8;
      pointLight.position.z = 2.2 + Math.sin(elapsedTime * 1.5) * 0.8;

      // Particle Vortex Inflow Physics
      const posAttr = particleGeom.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let p = 0; p < particleCount; p++) {
        // Accelerate inward (spiral tighter and faster)
        radii[p] -= speeds[p];
        angles[p] += 0.045 + (3.0 / Math.max(radii[p], 0.5)) * 0.015;

        // Reset when reaching the center core
        if (radii[p] < 0.4) {
          radii[p] = 4.8 + Math.random() * 1.2;
          angles[p] = Math.random() * Math.PI * 2;
        }

        posArray[p * 3] = radii[p] * Math.cos(angles[p]);
        posArray[p * 3 + 1] = radii[p] * Math.sin(angles[p]);
        posArray[p * 3 + 2] += Math.sin(elapsedTime + p) * 0.005;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Graceful Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coinGeom.dispose();
      outerRimGeom.dispose();
      innerRimGeom.dispose();
      ring1Geom.dispose();
      ring2Geom.dispose();
      particleGeom.dispose();
      goldMaterial.dispose();
      goldAccentMaterial.dispose();
      titaniumMaterial.dispose();
      emeraldCoreMaterial.dispose();
      particleMaterial.dispose();
    };
  }, [size]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <div
        ref={mountRef as any}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
