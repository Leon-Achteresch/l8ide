import assert from "node:assert/strict";
import { createMarkdownBridge } from "../src/lib/markdown-sync.ts";

const normalize = (s) => (s.endsWith("\n") ? s : s + "\n");

function harness(initial) {
  let writes = 0;
  let applies = 0;
  const model = {
    value: initial,
    fire: null,
    setValue(v) {
      this.value = v;
      this.fire?.();
    },
  };
  const crepe = { md: normalize(initial), onUpdate: null };
  const bridge = createMarkdownBridge(initial);

  const emitFromCrepe = (markdown) => {
    crepe.md = markdown;
    bridge.fromCrepe(markdown, (md) => {
      writes++;
      model.setValue(md);
    });
  };
  model.fire = () =>
    bridge.fromModel(model.value, (next) => {
      applies++;
      crepe.md = normalize(next);
      emitFromCrepe(crepe.md);
      return crepe.md;
    });

  crepe.md = normalize(initial);
  bridge.setReady(crepe.md);
  model.fire();
  writes = 0;
  applies = 0;
  return { model, crepe, bridge, get writes() { return writes; }, get applies() { return applies; } };
}

{
  const b = createMarkdownBridge("hi");
  let wrote = false;
  let applied = false;
  b.fromCrepe("x", () => (wrote = true));
  b.fromModel("y", (m) => ((applied = true), m));
  assert.equal(wrote, false, "no writes before ready");
  assert.equal(applied, false, "no applies before ready");
}

{
  const h = harness("hello");
  h.crepe.md = "typed in crepe";
  h.bridge.fromCrepe("typed in crepe", (md) => h.model.setValue(md));
  assert.equal(h.model.value, "typed in crepe", "crepe edit reaches model");
  assert.equal(h.applies, 0, "crepe->model does not bounce back into crepe");
}

{
  const h = harness("hello");
  h.model.setValue("edited in source");
  assert.equal(
    h.model.value,
    "edited in source",
    "source text is NOT reformatted by the crepe echo",
  );
  assert.equal(h.crepe.md, normalize("edited in source"), "crepe reflects source");
  assert.equal(h.writes, 0, "model->crepe echo does not write back to model");
}

{
  const h = harness("hello");
  const synced = h.crepe.md;
  h.model.setValue(synced);
  assert.equal(h.applies, 0, "a model change equal to synced value is swallowed");
}

console.log("test-markdown-sync: all assertions passed");
