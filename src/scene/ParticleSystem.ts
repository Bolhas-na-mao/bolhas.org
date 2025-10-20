import * as THREE from 'three';

export class ParticleSystem {
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private count: number;
  private radius: number;

  private positions: Float32Array;
  private velocities: THREE.Vector3[];
  private accelerations: THREE.Vector3[];
  private life: Float32Array;

  constructor(count: number, radius: number) {
    this.count = count;
    this.radius = radius;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.velocities = [];
    this.accelerations = [];
    this.life = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this.spawnParticle(i);
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );

    const textureLoader = new THREE.TextureLoader();
    const particleTexture = textureLoader.load('circle_05.png');

    this.material = new THREE.PointsMaterial({
      size: 0.05,
      map: particleTexture,
      color: 0xffffff,
      transparent: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
  }

  private spawnParticle(i: number) {
    const index = i * 3;

    const spawnRadius = this.radius * 3.5;

    const phi = Math.random() * Math.PI * 2;
    const costheta = Math.random() * 2 - 1;
    const u = Math.random();

    const theta = Math.acos(costheta);
    const r = spawnRadius * Math.cbrt(u);

    this.positions[index] = r * Math.sin(theta) * Math.cos(phi);
    this.positions[index + 1] = r * Math.sin(theta) * Math.sin(phi);
    this.positions[index + 2] = r * Math.cos(theta);

    this.velocities[i] = new THREE.Vector3();
    this.accelerations[i] = new THREE.Vector3();
    this.life[i] = 5.0 + Math.random() * 5.0;
  }

  public getMesh(): THREE.Points {
    return this.particles;
  }

  public disperse(): void {
    for (let i = 0; i < this.count; i++) {
      const strength = 10;
      this.velocities[i].x += (Math.random() - 0.5) * strength;
      this.velocities[i].y += (Math.random() - 0.5) * strength;
      this.velocities[i].z += (Math.random() - 0.5) * strength;
    }
  }

  public update(
    time: number,
    target: THREE.Vector3,
    excitement: number = 0
  ): void {
    const delta = 0.016;

    const excitementFactor = 1.0 + excitement * 4.0;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      this.life[i] -= delta;
      if (this.life[i] <= 0) {
        this.spawnParticle(i);
      }

      const currentPos = new THREE.Vector3(
        this.positions[index],
        this.positions[index + 1],
        this.positions[index + 2]
      );
      const direction = new THREE.Vector3().subVectors(target, currentPos);

      const distance = currentPos.length();

      const attractionStrength = Math.max(
        0,
        1.0 - distance / (this.radius * 6)
      );

      this.accelerations[i]
        .copy(direction)
        .normalize()
        .multiplyScalar(0.5 * attractionStrength * excitementFactor);

      this.velocities[i].add(this.accelerations[i].multiplyScalar(delta));

      const swirlStrength = 0.3;
      const swirl = new THREE.Vector3(
        Math.sin(time + i * 0.1),
        Math.cos(time + i * 0.11),
        -Math.sin(time + i * 0.12)
      ).multiplyScalar(swirlStrength);
      this.velocities[i].add(swirl.multiplyScalar(delta));

      this.velocities[i].multiplyScalar(0.96); // arrasto

      this.positions[index] += this.velocities[i].x * delta;
      this.positions[index + 1] += this.velocities[i].y * delta;
      this.positions[index + 2] += this.velocities[i].z * delta;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    (this.geometry.attributes.position as THREE.BufferAttribute).array =
      new Float32Array(0);
    this.geometry.dispose();
    if (this.material.map) this.material.map.dispose();
    this.material.dispose();
  }
}
