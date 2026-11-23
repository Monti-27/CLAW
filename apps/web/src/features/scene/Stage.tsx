"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { BackSide } from "three";
import { useQualityStore } from "@/stores/quality.store";

/**
 * Product-shoot lighting on a tight budget: every punctual light is paid for
 * by every lit pixel, so there are only three. One soft key with shadows,
 * two rims to cut the cabinet out of the haze; the fill and the long
 * reflections come from the baked environment, which is free per frame.
 */
export function Stage() {
  const { shadows, shadowMap } = useQualityStore((s) => s.profile);
  const tier = useQualityStore((s) => s.tier);

  return (
    <>
      <ambientLight intensity={0.15} color="#cdbfe0" />
      <hemisphereLight args={["#ded4ea", "#2a2430", 0.5]} />

      {/* key */}
      <spotLight
        position={[2.6, 4.6, 4.2]}
        angle={0.46}
        penumbra={0.9}
        intensity={50}
        decay={2}
        color="#fff1e6"
        castShadow={shadows}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-near={2}
        shadow-camera-far={10}
      />
      {/* rims */}
      <spotLight position={[-3, 3.2, -3.4]} angle={0.5} penumbra={0.8} intensity={12} color="#f0c6de" />
      <spotLight position={[3.2, 3.4, -3.2]} angle={0.5} penumbra={0.8} intensity={22} color="#e3d4ff" />

      {/* baked once: carries the fill light and every reflection on chrome, lacquer and glass */}
      <Environment resolution={tier === "low" ? 128 : 256} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 24, 12]} />
          <meshBasicMaterial side={BackSide} color="#3a3340" />
        </mesh>
        <Lightformer form="rect" intensity={2} position={[0, 4.5, 3]} scale={[7, 2.5, 1]} rotation-x={Math.PI / 3} />
        <Lightformer form="rect" intensity={2} position={[0, 1.3, 5]} scale={[4, 0.5, 1]} />
        {/* the old fill spot, now a soft card on the left */}
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#ffd9e8"
          position={[-4.5, 2.2, 2.5]}
          scale={[2, 4, 1]}
          rotation-y={Math.PI / 2.6}
        />
        <Lightformer form="rect" intensity={1.0} position={[4.5, 2, 1]} scale={[1.2, 4, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={1.5} color="#cdbfe0" position={[-3, 2, -4]} scale={[3, 3, 1]} rotation-y={Math.PI / 4} />
        <Lightformer form="rect" intensity={1.1} color="#e6dcf0" position={[3, 2, -4]} scale={[3, 3, 1]} rotation-y={-Math.PI / 4} />
      </Environment>
    </>
  );
}
