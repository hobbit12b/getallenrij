/**
 * Settle the rolled face on the physical top of the cube before applying the
 * overhead camera. These rotations match the six CSS .die-face transforms.
 */
export const faceRotations = Object.freeze({
  1: Object.freeze([90, 0]),
  2: Object.freeze([90, -90]),
  3: Object.freeze([0, 0]),
  4: Object.freeze([180, 0]),
  5: Object.freeze([90, 90]),
  6: Object.freeze([90, 180]),
});

export function dieTransform(value, spins = 0) {
  if (!Number.isInteger(value) || !faceRotations[value]) {
    throw new RangeError('A die result must be an integer from 1 to 6');
  }
  if (!Number.isInteger(spins) || spins < 0) {
    throw new RangeError('Spins must be a non-negative integer');
  }
  const [x, y] = faceRotations[value];
  return `rotateX(-78deg) rotateY(-24deg) rotateX(${x + spins * 360}deg) rotateY(${y + spins * 720}deg)`;
}
