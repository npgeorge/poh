import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface STLViewerProps {
  stlFile?: File;
  stlUrl?: string;
  className?: string;
}

export function STLViewer({ stlFile, stlUrl, className = '' }: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, -50, -50);
    scene.add(directionalLight2);

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || (!stlFile && !stlUrl)) return;

    const loader = new STLLoader();
    
    const loadSTL = (url: string) => {
      loader.load(
        url,
        (geometry) => {
          if (!sceneRef.current) return;

          // Remove previous models
          const existingModels = sceneRef.current.children.filter(
            child => child.userData.isModel
          );
          existingModels.forEach(model => sceneRef.current!.remove(model));

          // Create material
          const material = new THREE.MeshPhongMaterial({
            color: 0xff8500, // Primary orange color
            transparent: true,
            opacity: 0.9,
          });

          // Create mesh
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.isModel = true;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Center the model
          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const center = box.getCenter(new THREE.Vector3());
          geometry.translate(-center.x, -center.y, -center.z);

          // Scale to fit view
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 50 / maxDim;
          mesh.scale.setScalar(scale);

          sceneRef.current.add(mesh);

          // Reset camera position
          if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(0, 0, 100);
            controlsRef.current.reset();
          }
        },
        (progress) => {
          console.log('Loading progress:', progress);
        },
        (error) => {
          console.error('Error loading STL:', error);
        }
      );
    };

    if (stlFile) {
      const url = URL.createObjectURL(stlFile);
      loadSTL(url);
      return () => URL.revokeObjectURL(url);
    } else if (stlUrl) {
      loadSTL(stlUrl);
    }
  }, [stlFile, stlUrl]);

  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full min-h-[400px] rounded-lg overflow-hidden ${className}`}
      data-testid="stl-viewer"
    />
  );
}
