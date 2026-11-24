"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { FIGURE, LABEL } from "./glass";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The grip roll drawn as what it is: a number between 0 and 1 landing on a
 * scale where everything under the hold chance wins. The needle sweeps in
 * and settles; inside the pink zone the zone lights, outside it dims.
 */
export function RollMeter({
  value,
  need,
  won,
  size = "lg",
  delay = 0,
}: {
  value: number;
  need: number;
  won: boolean;
  size?: "lg" | "sm";
  delay?: number;
}) {
  const [landed, setLanded] = useState(false);
  const lg = size === "lg";
  const pct = (n: number) => `${Math.min(100, Math.max(0, n * 100))}%`;

  return (
    <div className={lg ? "w-[min(440px,84vw)]" : "w-full min-w-[min(280px,70vw)]"}>
      <div className="mb-2.5 flex items-end justify-between">
        <span className={`${LABEL} !text-[#ff8fc0]/80`}>
          Win zone <span className={`${FIGURE} ml-1 text-[11px] tracking-normal text-[#ff8fc0]`}>&lt; {need.toFixed(3)}</span>
        </span>
        <motion.span
          className={LABEL}
          initial={{ opacity: 0 }}
          animate={{ opacity: landed ? 1 : 0.35 }}
          transition={{ duration: 0.3 }}
        >
          Rolled{" "}
          <span className={`${FIGURE} ml-1 text-[11px] tracking-normal ${won ? "text-paper" : "text-paper/85"}`}>
            {value.toFixed(3)}
          </span>
        </motion.span>
      </div>

      <div className={`relative ${lg ? "h-2.5" : "h-2"}`}>
        {/* track with a tick every tenth */}
        <div className="absolute inset-0 overflow-hidden rounded-full bg-paper/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
          <motion.div
            className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#c92f74,#ff6aa8)]"
            initial={{ width: 0 }}
            animate={{ width: pct(need), opacity: landed && !won ? 0.45 : 1 }}
            transition={{ width: { duration: 0.7, ease: EASE, delay }, opacity: { duration: 0.4 } }}
          />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%-1px),rgba(12,7,15,0.55)_calc(10%-1px)_10%)]" />
        </div>
        {/* the threshold edge */}
        <motion.div
          className="absolute -top-1 -bottom-1 w-px bg-[#ffb3d6]"
          initial={{ left: 0, opacity: 0 }}
          animate={{ left: pct(need), opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay }}
        />
        {/* a win lights the zone */}
        {won && landed && (
          <motion.div
            className="absolute -inset-y-3 left-0 rounded-full bg-[radial-gradient(closest-side,rgba(255,106,168,0.55),transparent)] blur-md"
            style={{ width: pct(need) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.55] }}
            transition={{ duration: 0.9 }}
          />
        )}
        {/* the needle */}
        <motion.div
          className="absolute top-1/2"
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: pct(value), opacity: 1 }}
          transition={{ left: { duration: 1, ease: EASE, delay: delay + 0.2 }, opacity: { duration: 0.2, delay: delay + 0.2 } }}
          onAnimationComplete={() => setLanded(true)}
        >
          <motion.span
            className={`absolute block -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper shadow-[0_0_0_3px_rgba(12,7,15,0.85),0_2px_10px_rgba(0,0,0,0.6)] ${
              lg ? "h-6 w-[5px]" : "h-5 w-1"
            }`}
            animate={landed ? { scaleY: [1, 1.25, 1] } : {}}
            transition={{ duration: 0.35 }}
          />
        </motion.div>
      </div>

      {lg && (
        <div className={`mt-2 flex justify-between text-[10px] text-paper/30 ${FIGURE}`}>
          <span>0</span>
          <span>0.5</span>
          <span>1</span>
        </div>
      )}
    </div>
  );
}
