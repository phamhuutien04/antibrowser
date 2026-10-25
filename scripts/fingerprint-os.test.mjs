import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const result = await build({
  stdin: {
    contents: 'export { OS_OPTIONS, osIdFor, matchesOs } from "./src/shared/constants/index.ts"; export { deviceTypeOf, filterFingerprints } from "./src/entities/fingerprint/lib/facets.ts";',
    resolveDir: fileURLToPath(new URL("..", import.meta.url)),
  },
  bundle: true, write: false, platform: "node", format: "esm",
});
const { OS_OPTIONS, osIdFor, deviceTypeOf, filterFingerprints } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

test("iOS platforms belong to their own OS and mobile filter", () => {
  assert.ok(OS_OPTIONS.some((o) => o.id === "iOS"));
  for (const platform of ["iOS", "iOS 18", "iPhone", "iPad", "iPod"]) {
    assert.equal(osIdFor(platform), "iOS");
    assert.equal(deviceTypeOf({ platform }), "phone");
  }
  const items = [{ platform: "iPhone", label: "Phone" }, { platform: "MacIntel", label: "Mac" }, { platform: "Linux armv8l", label: "Android" }];
  assert.deepEqual(filterFingerprints(items, "", { os: "iOS", device: "phone", vendor: "all" }), [items[0]]);
});

test("existing desktop and Android classifications stay distinct", () => {
  for (const [platform, os] of [["MacIntel", "macOS"], ["Win32", "Windows"], ["Linux x86_64", "Linux"], ["Linux armv8l", "Android"]]) {
    assert.equal(osIdFor(platform), os);
  }
});

test("bundled iOS catalog contains selectable phone and tablet models", () => {
  const devices = JSON.parse(readFileSync(new URL("../src-tauri/presets/ios-devices.json", import.meta.url), "utf8"));
  const index = JSON.parse(readFileSync(new URL("../src-tauri/presets/apple-model-index.json", import.meta.url), "utf8"));
  assert.equal(devices.length, index.length);
  assert.equal(devices.length, 100);
  assert.equal(new Set(devices.map((d) => d.id)).size, devices.length);
  assert.equal(devices.filter((d) => d.platform === "iPhone").length, 55);
  assert.equal(devices.filter((d) => d.platform === "iPad").length, 45);
  for (const device of devices) {
    assert.equal(osIdFor(device.platform), "iOS");
    assert.equal(deviceTypeOf({ platform: device.platform }), "phone");
    assert.ok(device.width > 0 && device.height > device.width);
    assert.ok([1, 2, 3].includes(device.dpr));
    assert.ok(device.source.startsWith("https://support.apple.com/"));
    assert.equal(device.fingerprint_status, "hardware_specs_only");
    assert.ok(device.simulation_defaults.hardware_concurrency > 0);
    assert.ok(device.simulation_defaults.device_memory > 0);
    assert.ok(index.some((i) => i.name.replace(/‑/g, "-") === device.name));
  }
  const byName = Object.fromEntries(devices.map(d => [d.name, d]));
  assert.equal(byName["iPhone 6"].chip, "A8");
  assert.equal(byName["iPhone 5s"].chip, "A7");
  assert.equal(byName["iPhone 11 Pro"].width, 375);
  assert.equal(byName["iPhone 8 Plus"].width, 414);
  assert.deepEqual(byName["iPad Air 13-inch (M3)"].memory_gb_variants, [8]);
  assert.equal(byName["iPad Air 13-inch (M3)"].simulation_defaults.hardware_concurrency, 8);
  assert.equal(byName["iPad Air 13-inch (M3)"].simulation_defaults.device_memory, 8);
  assert.equal(byName["iPad 2"].simulation_defaults.hardware_concurrency, 2);
  assert.equal(byName["iPad 2"].simulation_defaults.device_memory, 0.5);
  assert.equal(byName["iPad 2"].hardware_gpu, "PowerVR SGX543MP2");
  assert.equal(byName["iPhone"].simulation_defaults.device_memory, 0.125);
  for(const d of devices){
    assert.ok(d.cpu_core_variants.length && d.gpu_core_variants.length && d.memory_gb_variants.length);
    assert.ok(d.hardware_gpu && d.hardware_sources.length);
    assert.ok(!d.chip.includes("công bố"));
  }
  assert.deepEqual(byName["iPad Pro 13-inch (M4)"].cpu_core_variants, [9, 10]);
});
