import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { InkPass, NOINK } from "./ink";

test("ink selects depth reconstruction by projection and restores render state", () => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera();
  const pass = new InkPass(scene, cam), input = new THREE.WebGLRenderTarget();
  // Exercise pass wiring without WebGL or drawing frames.
  const renderer = {
    autoClear: true, shadowMap: { autoUpdate: true },
    getClearColor: (c: THREE.Color) => c.set("#123456"), getClearAlpha: () => 1,
    setClearColor() {}, setRenderTarget() {}, clear() {}, render() {},
  } as unknown as THREE.WebGLRenderer;
  const u = pass["maskMat"].uniforms;
  for (const flat of [false, true, false]) {
    cam.updateProjectionMatrix();
    if (flat) cam.projectionMatrix.makeOrthographic(-2, 2, 3, -3, cam.near, cam.far);
    pass.render(renderer, input);
    assert.equal(u.orthographic.value, flat);
    assert.equal(u.p00.value, cam.projectionMatrix.elements[0]);
    assert.equal(u.p11.value, cam.projectionMatrix.elements[5]);
    assert.equal(scene.overrideMaterial, null);
    assert.equal(cam.layers.isEnabled(NOINK), true);
    assert.equal(renderer.autoClear, true);
    assert.equal(renderer.shadowMap.autoUpdate, true);
  }
  pass.dispose(); input.dispose();
});
