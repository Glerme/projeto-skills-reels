import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const runProcess = (command: string, args: string[], input?: string) => new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
  const child = spawn(command, args);
  let stdout = "", stderr = "";
  child.stdout.on("data", (data) => { stdout += data; });
  child.stderr.on("data", (data) => { stderr += data; });
  child.on("error", reject);
  child.on("close", (status) => resolve({ status, stdout, stderr }));
  child.stdin.end(input);
});

test("asset importer selects, retextures, registers, refuses overwrite and fails without partial imports", async () => {
  const root = mkdtempSync(join(tmpdir(), "shorts-import-test-"));
  try {
    mkdirSync(join(root, "scripts")); mkdirSync(join(root, "kit/kenney"), { recursive: true });
    for (const file of ["import-assets.sh", "retex_glb.py"]) copyFileSync(`scripts/${file}`, join(root, "scripts", file));
    const registry = join(root, "kit/models.json");
    writeFileSync(registry, '["existing","car-sedan"]');
    const fixture = await runProcess("python3", ["-", root], `
import json, pathlib, struct, sys, zipfile
root = pathlib.Path(sys.argv[1])
def glb(images):
    j = json.dumps({'asset': {'version': '2.0'}, 'images': images}).encode()
    j += b' ' * (-len(j) % 4)
    rest = struct.pack('<I4s', 4, b'BIN\\0') + b'abcd'
    return struct.pack('<4sIIII', b'glTF', 2, 20 + len(j) + len(rest), len(j), 0x4e4f534a) + j + rest
with zipfile.ZipFile(root / 'pack.zip', 'w') as z:
    z.writestr('Models/GLB format/sedan.glb', glb([{'uri': 'data:image/png;base64,YQ=='}, {'uri': 'Textures/colormap.png'}]))
    z.writestr('Models/GLB format/van.glb', glb([]))
    z.writestr('Models/GLB format/Textures/colormap.png', b'texture')
with zipfile.ZipFile(root / 'bad.zip', 'w') as z:
    z.writestr('a.glb', glb([]))
    z.writestr('b.glb', glb([{'uri': 'Textures/missing.png'}]))
with zipfile.ZipFile(root / 'traversal.zip', 'w') as z:
    z.writestr('../escape.glb', glb([]))
with zipfile.ZipFile(root / 'duplicate.zip', 'w') as z:
    z.writestr('a/same.glb', glb([]))
    z.writestr('b/same.glb', glb([]))
`);
    assert.equal(fixture.status, 0, fixture.stderr);
    const run = (archive: string, prefix: string, ...models: string[]) => runProcess("bash", [join(root, "scripts/import-assets.sh"), join(root, archive), prefix, ...models]);
    let r = await run("pack.zip", "car", "sedan"); assert.equal(r.status, 0, r.stderr);
    const model = join(root, "kit/kenney/car-sedan.glb"), bytes = readFileSync(model);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.equal(json.images[1].uri, "Textures/colormap-car.png");
    assert.equal(json.images[0].uri, "data:image/png;base64,YQ==");
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.equal(bytes.subarray(-4).toString(), "abcd");
    assert.equal(readFileSync(join(root, "kit/kenney/Textures/colormap-car.png"), "utf8"), "texture");
    assert.deepEqual(JSON.parse(readFileSync(registry, "utf8")), ["existing", "car-sedan"]);
    assert.equal(existsSync(join(root, "kit/kenney/car-van.glb")), false);
    r = await run("pack.zip", "car"); assert.notEqual(r.status, 0); assert.match(r.stderr, /sobrescrever/);
    assert.deepEqual(readFileSync(model), bytes);
    assert.equal(existsSync(join(root, "kit/kenney/car-van.glb")), false);
    r = await run("pack.zip", "town"); assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(registry, "utf8")), ["existing", "car-sedan", "town-sedan", "town-van"]);
    const previous = readFileSync(registry, "utf8");
    for (const [archive, prefix, ...models] of [["pack.zip", "bad", "missing"], ["pack.zip", "../escape"], ["bad.zip", "bad"], ["traversal.zip", "bad"], ["duplicate.zip", "bad"]]) {
      r = await run(archive, prefix, ...models); assert.notEqual(r.status, 0, `${archive}: ${r.stdout}`);
      assert.equal(readFileSync(registry, "utf8"), previous);
      assert.equal(existsSync(join(root, "kit/kenney/bad-a.glb")), false);
    }
    writeFileSync(join(root, "kit/kenney/Textures/colormap-other.png"), "different");
    r = await run("pack.zip", "other"); assert.notEqual(r.status, 0); assert.match(r.stderr, /textura/);
    assert.equal(readFileSync(registry, "utf8"), previous);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
