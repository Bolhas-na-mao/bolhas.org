import * as THREE from "three";

export class ParticleSystem {
  private particles: THREE.InstancedMesh;
  private particleCount: number;
  private velocities: Float32Array;
  private phases: Float32Array;
  private dummy = new THREE.Object3D();
  private basePositions: THREE.Vector3[] = [];
  private tempVec1 = new THREE.Vector3();
  private tempVec2 = new THREE.Vector3();

  private dispersing = false;
  private disperseTime = 0;

  constructor(count: number, bubbleRadius: number) {
    this.particleCount = count;
    this.velocities = new Float32Array(count * 3);
    this.phases = new Float32Array(count);

    const geometry = new THREE.SphereGeometry(0.015, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.InstancedMesh(geometry, material, count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = bubbleRadius + 0.3 + Math.random() * 0.4;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.basePositions.push(new THREE.Vector3(x, y, z));
      this.phases[i] = Math.random() * Math.PI * 2;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.particles.setMatrixAt(i, this.dummy.matrix);
    }

    this.particles.instanceMatrix.needsUpdate = true;
  }

  getMesh(): THREE.InstancedMesh {
    return this.particles;
  }

  update(time: number, mouseInfluence: THREE.Vector3): void {
    const material = this.particles.material as THREE.MeshBasicMaterial;

    if (this.dispersing) {
      this.disperseTime += 0.016;

      if (this.disperseTime > 2.0) {
        this.dispersing = false;
        this.disperseTime = 0;
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(
        this.dummy.position,
        this.dummy.quaternion,
        this.dummy.scale,
      );

      const basePos = this.basePositions[i];
      const phase = this.phases[i];

      const orbitSpeed = 0.15;
      const orbitRadius = 0.08;

      let targetX =
        basePos.x + Math.cos(time * orbitSpeed + phase) * orbitRadius;
      let targetY =
        basePos.y + Math.sin(time * orbitSpeed * 0.7 + phase) * orbitRadius;
      let targetZ =
        basePos.z + Math.sin(time * orbitSpeed * 0.5 + phase) * orbitRadius;

      if (mouseInfluence.length() > 0.01) {
        this.tempVec1.subVectors(
          this.dummy.position,
          mouseInfluence,
        );
        const dist = this.tempVec1.length();

        if (dist < 1.5) {
          const force = (1.5 - dist) / 1.5;
          this.tempVec1.normalize().multiplyScalar(force * 0.3);
          targetX += this.tempVec1.x;
          targetY += this.tempVec1.y;
          targetZ += this.tempVec1.z;
        }
      }

      if (this.dispersing) {
        const disperseForce = Math.min(this.disperseTime / 0.3, 1.0);
        const returnForce = Math.max((this.disperseTime - 0.5) / 1.5, 0.0);

        targetX += this.velocities[i * 3] * 15.0 * disperseForce;
        targetY += this.velocities[i * 3 + 1] * 15.0 * disperseForce;
        targetZ += this.velocities[i * 3 + 2] * 15.0 * disperseForce;

        this.tempVec2.subVectors(
          basePos,
          this.dummy.position,
        );
        targetX += this.tempVec2.x * returnForce * 0.1;
        targetY += this.tempVec2.y * returnForce * 0.1;
        targetZ += this.tempVec2.z * returnForce * 0.1;
      }

      this.dummy.position.x += (targetX - this.dummy.position.x) * 0.05;
      this.dummy.position.y += (targetY - this.dummy.position.y) * 0.05;
      this.dummy.position.z += (targetZ - this.dummy.position.z) * 0.05;

      const pulse = Math.sin(time * 2.0 + phase) * 0.15 + 0.85;
      this.dummy.scale.setScalar(pulse);

      this.dummy.updateMatrix();
      this.particles.setMatrixAt(i, this.dummy.matrix);
    }

    this.particles.instanceMatrix.needsUpdate = true;

    const baseOpacity = 0.6;
    const pulseOpacity = Math.sin(time * 1.5) * 0.1;
    material.opacity = baseOpacity + pulseOpacity;
  }

  disperse(): void {
    this.dispersing = true;
    this.disperseTime = 0;

    for (let i = 0; i < this.particleCount; i++) {
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
  }

  dispose(): void {
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
