import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float } from '@react-three/drei';
import * as THREE from 'three';

const ServerNode = ({ position, color, label }: { position: [number, number, number], color: string, label: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2;
        }
    });

    return (
        <group position={position}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <mesh ref={meshRef}>
                    <boxGeometry args={[1, 1.5, 1]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
                </mesh>
            </Float>
            <Text position={[0, -1.2, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
                {label}
            </Text>
        </group>
    );
};

const ConnectionLines = () => {
    const points = [
        new THREE.Vector3(-3, 0, 0),
        new THREE.Vector3(0, 0, -2),
        new THREE.Vector3(3, 0, 0),
        new THREE.Vector3(0, 0, 2),
        new THREE.Vector3(-3, 0, 0),
    ];

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    return (
        <line geometry={lineGeometry}>
            <lineBasicMaterial color="#38bdf8" opacity={0.3} transparent />
        </line>
    );
};

const Facilities3D: React.FC = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 24 }}>
            <div>
                <h2 style={{ fontSize: 28, color: '#fff' }}>3D Facility Map</h2>
                <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Spatial overview of connected Edge-AI nodes</p>
            </div>

            <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
                <Canvas camera={{ position: [5, 5, 8], fov: 50 }}>
                    <color attach="background" args={['#050811']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                    <ServerNode position={[-3, 0, 0]} color="#38bdf8" label="Node Alpha" />
                    <ServerNode position={[0, 0, -2]} color="#818cf8" label="Core Router" />
                    <ServerNode position={[3, 0, 0]} color="#34d399" label="Node Beta" />
                    <ServerNode position={[0, 0, 2]} color="#fbbf24" label="Edge Gateway" />

                    <ConnectionLines />

                    <OrbitControls
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2 + 0.1}
                        minPolarAngle={Math.PI / 4}
                        autoRotate
                        autoRotateSpeed={0.5}
                    />
                    <gridHelper args={[20, 20, '#1e293b', '#0f172a']} position={[0, -2, 0]} />
                </Canvas>

                {/* Overlay info */}
                <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(15, 23, 42, 0.8)', padding: 16, borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Network Status</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>4 Active Nodes</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>0.5ms Latency</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Facilities3D;
