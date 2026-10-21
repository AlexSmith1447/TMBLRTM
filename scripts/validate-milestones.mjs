import assert from "node:assert/strict";
import { MILESTONES, CULTURE_ERAS, CATEGORIES } from "../src/cultureData.js";
assert.ok(MILESTONES.length >= 50, "Milestone catalog must contain at least 50 items");
const ids = new Set(MILESTONES.map(e => e.id));
assert.equal(ids.size, MILESTONES.length, "Milestone IDs must be unique");
let previous = "";
for (const item of MILESTONES) {
  assert.match(item.id, /^[a-z0-9-]+$/);
  assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(item.date + "T00:00:00Z").toISOString().slice(0,10), item.date, "Invalid date: "+item.id);
  assert.ok(item.date >= "2009-01-01" && item.date <= "2015-12-31", "Event outside supported range: "+item.id);
  assert.ok(item.date >= previous, "Milestones must be sorted chronologically: "+item.id); previous=item.date;
  assert.ok(CATEGORIES.includes(item.category) && item.category !== "All");
  assert.ok(item.title && item.summary && item.kind);
  assert.ok(item.source.startsWith("https://"), "Missing HTTPS source: "+item.id);
  assert.ok(Array.isArray(item.tags) && item.tags.length > 0);
  assert.ok(["day","month"].includes(item.precision||"day"));
  if(item.precision==="month")assert.equal(item.date.slice(8),"01","Approximate months use first-day sort anchors");
  for (const related of item.related) assert.ok(ids.has(related), item.id+" references missing related milestone "+related);
}
for(const era of CULTURE_ERAS){
  assert.ok(era.start<=era.end);
  assert.ok(CATEGORIES.includes(era.category));
}
console.log("Validated "+MILESTONES.length+" milestones and "+CULTURE_ERAS.length+" cultural-era bands.");
