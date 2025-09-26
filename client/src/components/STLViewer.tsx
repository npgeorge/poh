import { useEffect, useRef, useState } from 'react';
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
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    try {
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

      // Renderer setup with error handling
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      
      // Check if WebGL context was successfully created
      const gl = renderer.getContext();
      if (!gl || gl.isContextLost()) {
        throw new Error('WebGL context could not be created or was lost');
      }
      
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
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      setWebglError('3D preview unavailable - WebGL not supported in this environment');
      return () => {}; // Empty cleanup function
    }
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

  // Show error fallback if WebGL failed
  if (webglError) {
    return (
      <div 
        className={`w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center ${className}`}
        data-testid="stl-viewer-error"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">{webglError}</p>
          <p className="text-muted-foreground text-xs mt-2">File uploaded successfully</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full min-h-[400px] rounded-lg overflow-hidden ${className}`}
      data-testid="stl-viewer"
    />
  );
}
