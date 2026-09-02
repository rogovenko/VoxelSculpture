import * as THREE from 'three';
import { CONFIG } from '../config';
import {
  parseFurnitureLayout,
  rotateYaw90,
  snapTo,
  type FurnitureLayout,
  type LayoutItem,
} from '../domain/levels/furnitureCatalog';
import workshopJson from '../domain/levels/layouts/workshop.json';
import { loadFurniturePrototypes, placeLayoutItem } from '../view/furnitureKit';

const FLOOR_Y = 0;
const ISO_Y = Math.SQRT1_2;

export class LayoutEditor {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);
  private readonly hit = new THREE.Vector3();
  private readonly furnitureRoot = new THREE.Group();
  private readonly resizeObserver: ResizeObserver;

  private layout: FurnitureLayout = parseFurnitureLayout(workshopJson);
  private prototypes!: Awaited<ReturnType<typeof loadFurniturePrototypes>>;
  private selected: THREE.Object3D | null = null;
  private helper: THREE.BoxHelper | null = null;
  private dragging = false;
  private dragOffset = new THREE.Vector2();
  private azimuth = Math.PI / 4;
  private frustum = 18;
  private orbiting = false;
  private lastPointer = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly rotateBtn: HTMLButtonElement,
    private readonly status: HTMLElement,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(CONFIG.colors.background);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404048, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(1, 2, 1.5);
    this.scene.add(sun, this.furnitureRoot);
    this.addSchematicRoom();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.bindInput();
    this.resize();
    this.updateCamera();
    this.status.textContent = this.layout.name;
  }

  async start(): Promise<void> {
    this.prototypes = await loadFurniturePrototypes();
    this.rebuildFurniture();
    this.loop();
  }

  loadLayout(layout: FurnitureLayout): void {
    this.clearSelection();
    this.layout = layout;
    this.rebuildFurniture();
    this.status.textContent = layout.name;
  }

  currentLayout(): FurnitureLayout {
    return {
      name: this.layout.name,
      items: this.layout.items.map((item) => ({ ...item })),
    };
  }

  rotateSelected(): void {
    const item = this.selectedItem();
    if (!item || !this.selected) return;
    item.yawDeg = rotateYaw90(item.yawDeg);
    placeLayoutItem(this.selected, item);
    this.refreshHelper();
  }

  private selectedItem(): LayoutItem | null {
    const id = this.selected?.userData.layoutId as string | undefined;
    if (!id) return null;
    return this.layout.items.find((item) => item.id === id) ?? null;
  }

  private rebuildFurniture(): void {
    this.furnitureRoot.clear();
    for (const item of this.layout.items) {
      const mesh = this.prototypes[item.kind].clone(true);
      mesh.userData.layoutId = item.id;
      placeLayoutItem(mesh, item);
      this.furnitureRoot.add(mesh);
    }
  }

  private addSchematicRoom(): void {
    const a = CONFIG.arena.halfExtent;
    const h = 4;
    const t = 0.12;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(a * 2, a * 2),
      new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    const grid = new THREE.GridHelper(a * 2, 24, 0x888880, 0x4a4a44);
    grid.position.y = 0.01;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x7a6a5a });
    const west = new THREE.Mesh(new THREE.BoxGeometry(t, h, a * 2), wallMat);
    west.position.set(-a, h / 2, 0);
    const south = new THREE.Mesh(new THREE.BoxGeometry(a * 2, h, t), wallMat);
    south.position.set(0, h / 2, -a);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.2, t + 0.04),
      new THREE.MeshLambertMaterial({ color: 0x3a2a22 }),
    );
    door.position.set(0, 1.6, -a);
    const gx = (CONFIG.grid.sizes.medium[0] * CONFIG.grid.voxelSize) / 2;
    const gz = (CONFIG.grid.sizes.medium[2] * CONFIG.grid.voxelSize) / 2;
    const glyba = new THREE.Mesh(
      new THREE.BoxGeometry(gx * 2, 0.04, gz * 2),
      new THREE.MeshLambertMaterial({ color: CONFIG.colors.blockout }),
    );
    glyba.position.y = 0.02;
    this.scene.add(floor, grid, west, south, door, glyba);
  }

  private bindInput(): void {
    this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    this.canvas.addEventListener('pointerup', () => this.onPointerUp());
    this.canvas.addEventListener('pointerleave', () => this.onPointerUp());
    this.canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.frustum = THREE.MathUtils.clamp(this.frustum * (event.deltaY > 0 ? 1.08 : 0.92), 8, 40);
        this.resize();
      },
      { passive: false },
    );
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyR') this.rotateSelected();
    });
  }

  private setPointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown(event: PointerEvent): void {
    this.setPointer(event);
    this.lastPointer = { x: event.clientX, y: event.clientY };
    if (event.button === 2 || event.button === 1) {
      this.orbiting = true;
      return;
    }
    if (event.button !== 0) return;
    const hit = this.pickFurniture();
    if (!hit) {
      this.clearSelection();
      return;
    }
    this.select(hit);
    const item = this.selectedItem();
    if (!item || !this.intersectFloor()) return;
    this.dragging = true;
    this.dragOffset.set(item.x - this.hit.x, item.z - this.hit.z);
    this.canvas.setPointerCapture(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    this.setPointer(event);
    if (this.orbiting) {
      this.azimuth -= (event.clientX - this.lastPointer.x) * 0.008;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.updateCamera();
      return;
    }
    if (!this.dragging || !this.selected) return;
    const item = this.selectedItem();
    if (!item || !this.intersectFloor()) return;
    const step = CONFIG.arena.layoutSnap;
    item.x = snapTo(this.hit.x + this.dragOffset.x, step);
    item.z = snapTo(this.hit.z + this.dragOffset.y, step);
    placeLayoutItem(this.selected, item);
    this.refreshHelper();
  }

  private onPointerUp(): void {
    this.dragging = false;
    this.orbiting = false;
  }

  private pickFurniture(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.furnitureRoot.children, true);
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node && node.parent !== this.furnitureRoot) node = node.parent;
      if (node?.userData.layoutId) return node;
    }
    return null;
  }

  private intersectFloor(): boolean {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.ray.intersectPlane(this.floorPlane, this.hit) !== null;
  }

  private select(object: THREE.Object3D): void {
    this.selected = object;
    this.rotateBtn.disabled = false;
    this.refreshHelper();
  }

  private clearSelection(): void {
    this.selected = null;
    this.rotateBtn.disabled = true;
    this.helper?.removeFromParent();
    this.helper = null;
  }

  private refreshHelper(): void {
    if (!this.selected) return;
    if (!this.helper) {
      this.helper = new THREE.BoxHelper(this.selected, 0xffffff);
      this.scene.add(this.helper);
    } else {
      this.helper.setFromObject(this.selected);
    }
    this.helper.update();
  }

  private updateCamera(): void {
    const r = 32;
    this.camera.position.set(Math.sin(this.azimuth) * r, r * ISO_Y, Math.cos(this.azimuth) * r);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -this.frustum * aspect;
    this.camera.right = this.frustum * aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };
}
