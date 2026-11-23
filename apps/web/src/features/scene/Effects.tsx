"use client";

import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useQualityStore } from "@/stores/quality.store";

/**
 * Bloom on real light sources only, a filmic curve and a lens falloff. All of
 * it merges into one effect pass. Bloom runs at reduced resolution (its blur
 * hides it), grain is desktop-only, and low-tier devices skip post entirely
 * and let the renderer do the tone mapping (see QualityRig).
 */
export function Effects() {
  const post = useQualityStore((s) => s.post);
  const { msaa, bloomScale } = useQualityStore((s) => s.profile);
  const tier = useQualityStore((s) => s.tier);
  if (!post) return null;

  const bloom = (
    <Bloom
      mipmapBlur
      intensity={0.62}
      luminanceThreshold={1.05}
      luminanceSmoothing={0.25}
      radius={0.72}
      resolutionScale={bloomScale}
    />
  );
  const tone = <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />;
  const vignette = <Vignette offset={0.32} darkness={0.72} />;
  return tier === "high" ? (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      {bloom}
      {tone}
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.04} />
      {vignette}
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      {bloom}
      {tone}
      {vignette}
    </EffectComposer>
  );
}
