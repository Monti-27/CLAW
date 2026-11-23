"use client";

import dynamic from "next/dynamic";

/** three.js is fetched and evaluated when the scene mounts (after the boot screen's reveal). */
const load = () => import("./ClawScene").then((m) => m.ClawScene);

/** WebGL only runs in the browser; keep three.js out of the server bundle. */
export const ClawSceneLazy = dynamic(load, { ssr: false, loading: () => null });
