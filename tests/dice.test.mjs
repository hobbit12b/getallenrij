import test from 'node:test';
import assert from 'node:assert/strict';
import { faceRotations, dieTransform, rollKeyframes } from '../dice.mjs';

// Independently derive each face normal from its actual CSS orientation:
// 1 is forward, 6 backward, 2 right, 5 left, 3 up, 4 down.
const normals = {
  1: [0, 0, 1], 2: [1, 0, 0], 3: [0, -1, 0],
  4: [0, 1, 0], 5: [-1, 0, 0], 6: [0, 0, -1],
};
const radians = degrees => degrees * Math.PI / 180;
const rotateX = ([x, y, z], degrees) => {
  const c = Math.cos(radians(degrees)), s = Math.sin(radians(degrees));
  return [x, c * y - s * z, s * y + c * z];
};
const rotateY = ([x, y, z], degrees) => {
  const c = Math.cos(radians(degrees)), s = Math.sin(radians(degrees));
  return [c * x + s * z, y, -s * x + c * z];
};
const nearVector = (actual, expected) => actual.forEach((value, i) =>
  assert.ok(Math.abs(value - expected[i]) < 1e-10, `${actual} should be ${expected}`));
const rotationsFromCss = value => [...value.matchAll(/rotate([XY])\((-?[\d.]+)deg\)/g)]
  .map(([, axis, degrees]) => [axis, Number(degrees)]);
const applyCss = (normal, rotations) => rotations.reduceRight((vector, [axis, degrees]) =>
  (axis === 'X' ? rotateX : rotateY)(vector, degrees), normal);

test('every rolled face lands on physical top, with its opposite underneath', () => {
  for (let value = 1; value <= 6; value++) {
    const [x, y] = faceRotations[value];
    const settle = [['X', x], ['Y', y]];
    nearVector(applyCss(normals[value], settle), [0, -1, 0]);
    nearVector(applyCss(normals[7 - value], settle), [0, 1, 0]);
  }
});

test('overhead camera makes every result the clearly dominant visible face', () => {
  for (let value = 1; value <= 6; value++) {
    const css = rotationsFromCss(dieTransform(value));
    const topNormal = applyCss(normals[value], css);
    assert.ok(topNormal[2] > 0.90, `Result ${value} must retain at least 90% projected area toward the viewer`);
    for (let other = 1; other <= 6; other++) {
      if (other !== value) {
        const normal = applyCss(normals[other], css);
        assert.ok(normal[2] < 0.40, `Side ${other} must not compete with result ${value}`);
      }
    }
  }
});

test('whole animation spins do not change the final face', () => {
  for (let value = 1; value <= 6; value++) {
    const rest = applyCss(normals[value], rotationsFromCss(dieTransform(value)));
    for (const spins of [1, 3, 7]) {
      nearVector(applyCss(normals[value], rotationsFromCss(dieTransform(value, spins))), rest);
    }
  }
});

test('CSS transform remains a predictable four-rotation animation sequence', () => {
  assert.equal(dieTransform(1), 'rotateX(-65deg) rotateY(-24deg) rotateX(90deg) rotateY(0deg)');
  assert.equal(dieTransform(4, 3), 'rotateX(-65deg) rotateY(-24deg) rotateX(1260deg) rotateY(2160deg)');
  for (let value = 1; value <= 6; value++) {
    assert.equal(rotationsFromCss(dieTransform(value)).length, 4);
  }
  for (const invalid of [0, 7, 2.5, NaN, '2']) assert.throws(() => dieTransform(invalid), RangeError);
  for (const invalid of [-1, 0.5, Infinity]) assert.throws(() => dieTransform(1, invalid), RangeError);
});


test('a repeated result still interpolates three full X spins and six Y spins', () => {
  for (let value = 1; value <= 6; value++) {
    const [start,end] = rollKeyframes(value,value).map(f=>rotationsFromCss(f.transform));
    assert.deepEqual(start.map(r=>r[0]),end.map(r=>r[0]));
    assert.equal(end[2][1]-start[2][1],1080);
    assert.equal(end[3][1]-start[3][1],2160);
    const halfway = start.map(([axis,degrees],i)=>[axis,degrees+(end[i][1]-degrees)*.125]);
    assert.ok(Math.abs(applyCss(normals[value],halfway)[2]-applyCss(normals[value],start)[2])>.1);
  }
});
