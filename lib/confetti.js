"use client";

import confetti from "canvas-confetti";

const PALETTE = ["#FFC857", "#FF5D8F", "#4EE1A0", "#5EC2FF"];

export function fireConfetti(options = {}) {
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.6 },
    colors: PALETTE,
    ...options,
  });
}

// A slightly bigger, two-burst version for "you're #1" moments.
export function fireBigConfetti() {
  fireConfetti({ particleCount: 70, angle: 60, origin: { x: 0.15, y: 0.6 } });
  fireConfetti({ particleCount: 70, angle: 120, origin: { x: 0.85, y: 0.6 } });
}
