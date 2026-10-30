// Read-only Figma sensor for use_figma. Replace __PAGE_ID__ before sending. One page per call.
const PAGE_ID = '__PAGE_ID__';
// Shared chrome present in every frame; an edit to it would change every frame's hash.
const IGNORE = new Set(__IGNORE__);
const pg = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(pg);
const cats = await figma.annotations.getAnnotationCategoriesAsync();
const catLabel = Object.fromEntries(cats.map(c => [c.id, c.label]));
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
function sig(n) {
  let s = `${n.type}|${Math.round(n.width || 0)}x${Math.round(n.height || 0)}|${'visible' in n ? n.visible : ''}`; // v3: no layer names (renames are not design changes)
  if (n.type === 'TEXT') s += `|${n.characters}`;
  if ('fills' in n && Array.isArray(n.fills)) s += '|' + n.fills.map(f => f.type === 'SOLID' ? `${f.color.r.toFixed(2)},${f.color.g.toFixed(2)},${f.color.b.toFixed(2)}` : f.type).join(';');
  if (n.type === 'INSTANCE' && n.componentProperties) s += '|' + Object.entries(n.componentProperties).filter(([,v]) => v.type === 'VARIANT' || v.type === 'TEXT' || v.type === 'BOOLEAN').map(([k,v]) => `${k}=${v.value}`).sort().join(';');
  return s;
}
const items = [];
function frameItem(f, section) {
  const parts = [sig(f)];
  const walkKids = (n) => { if (!('children' in n)) return; for (const c of n.children) { if (IGNORE.has(c.name)) { parts.push(`IGNORED|${c.name}`); continue; } parts.push(sig(c)); walkKids(c); } };
  walkKids(f);
  items.push({ id: `frame:${f.id}`, hash: fnv(parts.join('\n')), meta: { name: f.name, section, page: pg.name, layers: parts.length } });
}
function walk(n, section) {
  if (n.type === 'SECTION') {
    items.push({ id: `section:${n.id}`, hash: fnv(n.name + '|' + n.children.map(c => c.id + ':' + c.name).join(',')), meta: { name: n.name, page: pg.name } });
    for (const c of n.children) walk(c, n.name);
  } else if (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE' || n.type === 'COMPONENT_SET') frameItem(n, section);
}
for (const c of pg.children) walk(c, null);
for (const n of pg.findAll(x => 'annotations' in x && x.annotations && x.annotations.length)) {
  let s = n; while (s.parent && s.parent.type !== 'SECTION' && s.parent.type !== 'PAGE') s = s.parent;
  n.annotations.forEach((a, i) => items.push({ id: `annot:${n.id}:${i}`, hash: fnv((a.labelMarkdown || a.label || '') + '|' + (a.categoryId || '')), meta: { text: a.labelMarkdown || a.label || '', category: catLabel[a.categoryId] || null, layer: n.name, screen: s.id, screenName: s.name } }));
}
return { source: 'figma', page: PAGE_ID, items };
