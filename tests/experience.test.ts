import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout, stopStream, friendlyCameraError } from '../lib/beauty/camera.ts';
import { MovementTracker, coverBox } from '../lib/beauty/movement.ts';
import { SCAN_DURATION, progressAt, messageAt } from '../lib/beauty/experience.ts';
const box = (x = .2) => ({ x, y: .2, width: .3, height: .3 });
test('progress completes at duration, stays bounded and keeps surprise for late analysis', () => {
  assert.equal(progressAt(-500), 0); assert.equal(progressAt(SCAN_DURATION), 100); assert.equal(progressAt(SCAN_DURATION * 2), 100);
  for (let time = 1; time <= SCAN_DURATION; time += 137) assert.ok(progressAt(time) >= progressAt(time - 1));
  assert.equal(messageAt(83), 'Beleza acima do limite permitido.');
  assert.equal(messageAt(12, true), 'Intuição conectada.');
  assert.ok(!messageAt(12, true).includes('Rosto'));
});
test('cover coordinates line up in portrait and landscape viewports', () => {
  assert.deepEqual(coverBox({ x: .25, y: .25, width: .5, height: .5 }, 640, 480, 640, 480), { x: 160, y: 120, width: 320, height: 240 });
  assert.deepEqual(coverBox({ x: .25, y: .25, width: .5, height: .5 }, 640, 480, 300, 400), { x: 16.666666666666657, y: 100, width: 266.6666666666667, height: 200 });
  assert.equal(coverBox(box(), 0, 0, 300, 400).width, 0);
});
test('movement needs sustained displacement and resets after losing the face', () => {
  const tracker = new MovementTracker();
  assert.equal(tracker.update(box(), 0), false);
  assert.equal(tracker.update(box(.201), 100), false);
  assert.equal(tracker.update(box(.3), 200), false);
  assert.equal(tracker.update(box(.3), 300), false);
  assert.equal(tracker.update(box(.3), 400), true);
  assert.equal(tracker.update(null, 1300), false);
  assert.equal(tracker.update(box(.3), 1400), false);
});
test('timeout stops a late camera stream instead of leaking it', async () => {
  let stopped = 0;
  const media = { getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] } as unknown as MediaStream;
  let resolve!: (stream: MediaStream) => void;
  const pending = new Promise<MediaStream>(done => { resolve = done; });
  await assert.rejects(withTimeout(pending, 5, 'timeout', stopStream), /timeout/);
  resolve(media); await new Promise(done => setTimeout(done, 5)); assert.equal(stopped, 2);
});
test('timeout closes a late model and successful initialization keeps the resource', async () => {
  let closed = 0; let resolve!: (model: { close: () => void }) => void;
  const model = { close: () => { closed++; } };
  const pending = new Promise<typeof model>(done => { resolve = done; });
  await assert.rejects(withTimeout(pending, 5, 'timeout', item => item.close()), /timeout/);
  resolve(model); await new Promise(done => setTimeout(done, 5)); assert.equal(closed, 1);
  assert.equal(await withTimeout(Promise.resolve(model), 20, 'timeout', item => item.close()), model);
  assert.equal(closed, 1);
});
test('camera errors always offer understandable recovery', () => {
  for (const name of ['NotAllowedError','NotFoundError','NotReadableError','OverconstrainedError','SecurityError']) {
    const error = new Error(); error.name = name; assert.ok(friendlyCameraError(error).length > 35);
  }
});

