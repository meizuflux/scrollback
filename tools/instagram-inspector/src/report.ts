import type { Inventory } from "./inventory.ts";

const safeInventory = (data: Inventory) =>
	JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

const styles = String.raw`
:root { color: #18201b; background: #f7f8f5; font-family: system-ui, sans-serif; }
body { margin: 0; line-height: 1.45; }
header { padding: .75rem 1rem; background: #173d2b; color: white; }
main { padding: .75rem 1rem; }
nav, .toolbar { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1rem 0; }
button, input, a { font: inherit; }
button, input { padding: .5rem; border: 1px solid #9ca8a0; border-radius: .3rem; background: white; }
button { cursor: pointer; }
button:focus, input:focus, a:focus, summary:focus { outline: 3px solid #e5a229; outline-offset: 2px; }
a { color: #164f78; cursor: pointer; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: .75rem; }
.card, .table, .raw { padding: .75rem; border: 1px solid #d9ded9; border-radius: .45rem; background: white; }
.table { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: .45rem; border-bottom: 1px solid #e5e8e4; text-align: left; vertical-align: top; }
.badge { padding: .1em .45em; border: 1px solid #aaa; border-radius: 1em; font-size: .8em; }
.split { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
.split > .tree, .split > .raw { min-width: 0; margin: 0; }
.raw { position: sticky; top: 0; height: 100vh; height: 100dvh; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
.raw h2 { margin: 0 0 .75rem; }
.raw > button { align-self: flex-start; flex-shrink: 0; }
@media (max-width: 850px) { .split { grid-template-columns: 1fr; } .raw { position: static; } }

.tree { padding: .75rem 0 .75rem 1.25rem; font: .9rem ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.tree h2, .tree > p, .tree .toolbar { font-family: system-ui, sans-serif; }
.tree h2 { margin: 0 0 .4rem; }
.tree > p { color: #66736a; font-size: .85rem; margin: 0 0 1rem; }
.tree .child { margin-left: 1ch; padding-left: 2ch; }
.tree .schema-node { line-height: 1.8; overflow-wrap: anywhere; }
.tree summary::-webkit-details-marker { display: none; }
.tree details { margin: .15rem 0; padding: 0; border: 0; background: transparent; }
.tree summary { position: relative; cursor: pointer; list-style: none; line-height: 1.5; }
.tree summary::before { position: absolute; left: -1.15rem; width: .9rem; color: #536058; text-align: center; content: "\25BE "; }
.tree details:not([open]) > summary::before { content: "\25B8 "; }
.child { margin-left: 3ch; padding-left: 1ch; border-left: 1px solid #d9ded9; }
.schema-key { color: #7a3e00; }
.schema-punctuation { color: #66736a; }
.schema-type { color: #365d94; font-weight: 600; }

.annotation {
  margin-left: 1.5ch; color: #66736a; font: .8rem system-ui, sans-serif;
}
.annotation.constant { color: #17663b; }
.collapsed-end { display: none; color: #66736a; }
details:not([open]) > summary > .collapsed-end { display: inline; }
.labelled-fields {
  margin: .35rem 0 .45rem; padding: .45rem .6rem; border-left: 3px solid #8da98e;
  background: #f3f7f2; color: #425842; font-family: system-ui, sans-serif;
}
.labelled-fields > :first-child { font-size: .84rem; }
.labelled-fields.compact { margin: .3rem 0; padding: .15rem .45rem; border-left-width: 2px; background: transparent; font-size: .82rem; }
.labelled-entry { margin: .35rem 0 .35rem 3ch; padding-left: 1ch; border-left: 1px solid #d9ded9; }
.labelled-entry > summary { color: #26332b; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.raw pre { flex: 1; min-height: 0; margin: .75rem 0 0; overscroll-behavior: contain; overflow: auto; overflow-wrap: anywhere; white-space: pre-wrap; font: .9rem Menlo, Monaco, ui-monospace, monospace; }
.json-key { color: #7a3e00; }
.json-string { color: #17663b; }
.json-number { color: #365d94; }
.json-boolean, .json-null { color: #8a3d76; }
.cross-reference { outline: 2px solid #e5a229; outline-offset: 2px; background: #fff3d5; border-radius: .15rem; }
`;

const client = String.raw`
const data = JSON.parse(document.querySelector("#inventory").textContent);
const app = document.querySelector("#app");
const search = document.querySelector("#search");
const status = document.querySelector("#status");
const folderStatus = document.querySelector("#folder-status");
const chooseFolderButton = document.querySelector("#choose-folder");
let page = 0;
let sourceRoot;

const element = (tag, text) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};
const link = (text, hash) => {
  const node = element("a", text);
  node.href = "#" + hash;
  return node;
};
const family = id => data.families.find(item => item.id === id);
const file = id => data.files.find(item => item.id === id);
const category = id => data.categories.find(item => item.id === id);
const matchesSearch = text => text.toLowerCase().includes(search.value.toLowerCase());
const typeText = node => Object.keys(node.types).join(" | ");
const valueText = value => value === null ? "null" : JSON.stringify(value);
const maximumEagerLabelGroups = 12;
const pointerSegment = value => value.replaceAll("~", "~0").replaceAll("/", "~1");
const schemaPath = node => node.path.map(segment => "/" + (segment.kind === "item" ? "*" : pointerSegment(segment.value))).join("");

function containerBrackets(node) {
  const hasObject = Boolean(node.types.object);
  const hasArray = Boolean(node.types.array);
  if (hasObject && !hasArray) return ["{", "}"];
  if (hasArray && !hasObject) return ["[", "]"];
  return undefined;
}

function appendSignature(target, node) {
  const leaf = node.path.at(-1);
  if (leaf?.kind === "key") {
    const key = element("span", JSON.stringify(leaf.value));
    key.className = "schema-key";
    const punctuation = element("span", ": ");
    punctuation.className = "schema-punctuation";
    target.append(key, punctuation);
  }
  const brackets = containerBrackets(node);
  if (brackets) {
    const opening = element("span", brackets[0] + " ");
    opening.className = "schema-punctuation";
    target.append(opening);
    if (Object.keys(node.types).length === 1) {
      if (!node.children.length) target.append(element("span", brackets[1]));
      else {
        const ending = element("span", " … " + brackets[1]);
        ending.className = "collapsed-end";
        target.append(ending);
      }
      return;
    }
  }
  const type = element("span", typeText(node));
  type.className = "schema-type";
  target.append(type);
}

function addAnnotation(target, text, kind) {
  const annotation = element("span", "— " + text);
  annotation.className = "annotation " + kind;
  target.append(annotation);
}

function annotateSignature(target, node) {
  if (node.arrayLengths) {
    const lengths = node.arrayLengths;
    const single = lengths.min === lengths.max ? { length: lengths.min } : undefined;
    const items = count => count + " item" + (count === 1 ? "" : "s");
    if (single?.length === 0) addAnnotation(target, "always empty", "array");
    else if (single) addAnnotation(target, lengths.arrayCount === 1 ? items(single.length) + " in the observed array" : "exactly " + items(single.length), "array");
    else addAnnotation(target, lengths.min + "–" + lengths.max + " items", "array");
  }
  const values = node.values;
  if (values?.distinctCountExact && values.values.length === 1 && values.values[0].count === values.occurrenceCount) {
    addAnnotation(target, "always " + valueText(values.values[0].value), "constant");
  }
  if (node.parentObjectCount && node.presentInParents < node.parentObjectCount) {
    addAnnotation(target, "present in " + node.presentInParents + " / " + node.parentObjectCount + " objects", "presence");
  }
}

function addTooltip(target, node) {
  const facts = [];
  if (node.parentObjectCount && node.presentInParents !== undefined) facts.push("Present in " + node.presentInParents + " / " + node.parentObjectCount + " parent objects.");
  if (node.values) {
    facts.push((node.values.distinctCountExact ? "Exactly " : "At least ") + node.values.distinctCount + " distinct values across " + node.values.occurrenceCount + " occurrences.");
    if (node.values.emptyStringCount) facts.push("Empty strings: " + node.values.emptyStringCount + ".");
  }
  if (node.arrayLengths) facts.push("Array lengths: " + node.arrayLengths.min + "–" + node.arrayLengths.max + " across " + node.arrayLengths.arrayCount + " arrays.");
  if (node.nullCount) facts.push("Explicit nulls: " + node.nullCount + ".");
  if (facts.length) {
    target.title = facts.join("\n");
    target.setAttribute("aria-label", target.textContent + " " + facts.join(" "));
  }
}

function labelledFields(groups, key, summary) {
  if (summary) {
    const wrapper = element("div");
    wrapper.className = "labelled-fields compact";
    wrapper.append(element("div", "Derived " + summary.discriminators.join("/") + " groups omitted — " + summary.count + " distinct record-specific values."));
    return wrapper;
  }
  const usable = groups.filter(group => group.discriminator !== "unclassified" && group.value !== "");
  if (!usable.length) return undefined;
  const wrapper = element("details");
  wrapper.className = "labelled-fields";

  if (usable.length > maximumEagerLabelGroups) {
    const discriminators = [...new Set(usable.map(group => group.discriminator))].join("/");
    wrapper.classList.add("compact");
    wrapper.append(element("div", "Derived " + discriminators + " groups omitted — " + usable.length + " distinct record-specific values."));
    return wrapper;
  }

  wrapper.append(element("summary", "Labelled entries · " + usable.length + " observed labels"));
  usable.forEach((group, groupIndex) => {
    const entry = element("details");
    entry.className = "labelled-entry";
    entry.open = true;
    entry.append(element("summary", group.discriminator + " = " + valueText(group.value) + " — " + group.count + " entr" + (group.count === 1 ? "y" : "ies")));
    const fields = element("div");
    fields.className = "child";
    group.observation.children
      .filter(child => child.path.at(-1)?.kind !== "key" || child.path.at(-1).value !== group.discriminator)
      .forEach((child, childIndex) => fields.append(renderTree(child, key + "/label-" + groupIndex + "/" + childIndex)));
    entry.append(fields);
    wrapper.append(entry);
  });
  return wrapper;
}

function renderTree(node, key = "root") {
  const isContainer = node.children.length > 0 && Object.keys(node.types).some(type => type === "object" || type === "array");
  if (!isContainer) {
    const row = element("div");
    row.className = "schema-node";
    row.dataset.schemaPath = schemaPath(node);
    appendSignature(row, node);
    annotateSignature(row, node);
    addTooltip(row, node);
    return row;
  }
  const details = element("details");
  details.className = "schema-node";
  details.dataset.schemaPath = schemaPath(node);
  details.open = true;
  const summary = element("summary");
  appendSignature(summary, node);
  annotateSignature(summary, node);
  addTooltip(summary, node);
  details.append(summary);
  const children = element("div");
  children.className = "child";
  if (node.arrayCount && node.emptyArrayCount === node.arrayCount && !node.children.length) {
    children.append(element("div", "item type not observed"));
  } else {
    node.children.forEach((child, index) => children.append(renderTree(child, key + "/" + index)));
  }
  const labels = node.labelGroups || node.labelGroupSummary
    ? labelledFields(node.labelGroups || [], key, node.labelGroupSummary)
    : undefined;
  if (labels) children.append(labels);
  const brackets = containerBrackets(node);
  if (brackets) {
    const closing = element("div", brackets[1]);
    closing.className = "schema-punctuation";
    children.append(closing);
  }
  details.append(children);
  return details;
}

function pathsMatch(schemaPath, jsonPath) {
  const schema = schemaPath.split("/").slice(1);
  const json = jsonPath.split("/").slice(1);
  return schema.length === json.length && schema.every((segment, index) => segment === "*" || segment === json[index]);
}

function clearHighlights() {
  document.querySelectorAll(".cross-reference").forEach(node => node.classList.remove("cross-reference"));
}

function highlightSchema(path) {
  clearHighlights();
  document.querySelectorAll(".schema-node").forEach(node => {
    if (node.dataset.schemaPath === path) node.classList.add("cross-reference");
  });
  document.querySelectorAll("[data-json-path]").forEach(node => {
    if (pathsMatch(path, node.dataset.jsonPath)) node.classList.add("cross-reference");
  });
}

function highlightJson(path) {
  clearHighlights();
  document.querySelectorAll("[data-json-path]").forEach(node => {
    if (node.dataset.jsonPath === path) node.classList.add("cross-reference");
  });
  document.querySelectorAll(".schema-node").forEach(node => {
    if (pathsMatch(node.dataset.schemaPath, path)) node.classList.add("cross-reference");
  });
}

function wireCrossReferences() {
  document.querySelectorAll(".schema-node").forEach(node => {
    node.onpointerenter = () => highlightSchema(node.dataset.schemaPath);
    node.onpointerleave = () => clearHighlights();
  });
  document.querySelectorAll("[data-json-path]").forEach(node => {
    node.onpointerenter = () => highlightJson(node.dataset.jsonPath);
    node.onpointerleave = () => clearHighlights();
  });
}

function structure(node) {
  const section = element("section");
  section.className = "tree";
  section.append(element("h2", "Observed structure"), element("p", "Family structure across analyzed files. Annotations describe this scan, not guaranteed rules."));
  const toolbar = element("div");
  toolbar.className = "toolbar";
  const expand = element("button", "Expand all");
  const collapse = element("button", "Collapse all");
  expand.onclick = () => section.querySelectorAll("details.schema-node").forEach(detail => { detail.open = true; });
  collapse.onclick = () => section.querySelectorAll("details").forEach(detail => { detail.open = false; });
  toolbar.append(expand, collapse);
  section.append(toolbar, renderTree(node));
  return section;
}

function table(headers, rows) {
  const wrapper = element("div");
  wrapper.className = "table";
  const output = element("table");
  const header = element("tr");
  headers.forEach(text => header.append(element("th", text)));
  output.append(header);
  rows.forEach(row => {
    const tableRow = element("tr");
    row.forEach(value => {
      const cell = element("td");
      if (value instanceof Node) cell.append(value);
      else cell.textContent = value;
      tableRow.append(cell);
    });
    output.append(tableRow);
  });
  wrapper.append(output);
  return wrapper;
}

function overview() {
  const section = element("section");
  section.append(element("h1", "Overview"));
  if (!data.files.length) {
    section.append(element("p", "No JSON files were found. Select an extracted export folder that contains JSON files."));
    return section;
  }
  const cards = element("div");
  cards.className = "cards";
  [["JSON files", data.summary.totalFiles, "files"], ["JSON size", data.summary.totalBytes.toLocaleString(), "files"], ["Analyzed", data.summary.analyzedJson, "files"], ["Failed", data.summary.failedJson, "files?status=failed"], ["Skipped", data.summary.skippedJson, "files?status=skipped"]].forEach(([label, value, hash]) => {
    const card = element("div");
    card.className = "card";
    card.append(link(String(value), hash), element("div", label));
    cards.append(card);
  });
  section.append(cards, element("p", data.scan.excludedNonJsonFiles.toLocaleString() + " non-JSON files excluded from this report."), element("h2", "Categories"));
  data.categories.filter(item => matchesSearch(item.name) || item.familyIds.map(family).filter(Boolean).some(family => matchesSearch(family.name + " " + family.pathContext))).forEach(item => {
    const details = element("details");
    details.open = true;
    details.append(element("summary", item.name + " — " + item.fileCount + " JSON files, " + item.familyIds.length + " families" + (item.issueCount ? " · " + item.issueCount + " issues" : "")));
    item.familyIds.map(family).filter(Boolean).filter(item => matchesSearch(item.name + " " + item.pathContext)).forEach(item => {
      const row = element("div");
      row.className = "child";
      row.append(link(item.name, "family=" + encodeURIComponent(item.id)), element("span", " · " + item.pathContext + " · " + item.memberIds.length + " file" + (item.memberIds.length === 1 ? "" : "s")));
      if (!item.registered) {
        const badge = element("span", "Unregistered");
        badge.className = "badge";
        row.append(document.createTextNode(" "), badge);
      }
      details.append(row);
    });
    section.append(details);
  });
  return section;
}

function familyView(id) {
  const current = family(id);
  if (!current) return overview();
  if (current.memberIds.length === 1) return fileView(current.memberIds[0]);
  const section = element("section");
  section.append(link("← Overview", "overview"), element("h1", current.name));
  section.append(element("p", current.pathContext + " · " + current.rule + " · " + current.contributingFileCount + " of " + current.memberIds.length + " files contributed to structure."));
  if (current.aggregate) section.append(structure(current.aggregate));
  section.append(element("h2", "Files"), table(["Path", "Status", "Bytes"], current.memberIds.map(fileId => {
    const currentFile = file(fileId);
    return [link(currentFile.path, "file=" + encodeURIComponent(fileId)), currentFile.status, currentFile.size.toLocaleString()];
  })));
  return section;
}

function jsonToken(text, className, path) {
  const token = element("span", text);
  token.className = "json-token " + className;
  token.dataset.jsonPath = path;
  return token;
}

function renderRawJson(value, pre) {
  const fragment = document.createDocumentFragment();
  const indent = depth => "    ".repeat(depth);
  const write = (current, path, depth) => {
    if (Array.isArray(current)) {
      fragment.append(jsonToken("[", "schema-punctuation", path));
      if (current.length) {
        fragment.append(document.createTextNode("\n"));
        current.forEach((item, index) => {
          const itemPath = path + "/" + index;
          fragment.append(document.createTextNode(indent(depth + 1)));
          write(item, itemPath, depth + 1);
          if (index < current.length - 1) fragment.append(document.createTextNode(","));
          fragment.append(document.createTextNode("\n"));
        });
        fragment.append(document.createTextNode(indent(depth)));
      }
      fragment.append(jsonToken("]", "schema-punctuation", path));
      return;
    }
    if (current !== null && typeof current === "object") {
      const entries = Object.entries(current);
      fragment.append(jsonToken("{", "schema-punctuation", path));
      if (entries.length) {
        fragment.append(document.createTextNode("\n"));
        entries.forEach(([key, child], index) => {
          const childPath = path + "/" + pointerSegment(key);
          fragment.append(document.createTextNode(indent(depth + 1)), jsonToken(JSON.stringify(key), "json-key", childPath), document.createTextNode(": "));
          write(child, childPath, depth + 1);
          if (index < entries.length - 1) fragment.append(document.createTextNode(","));
          fragment.append(document.createTextNode("\n"));
        });
        fragment.append(document.createTextNode(indent(depth)));
      }
      fragment.append(jsonToken("}", "schema-punctuation", path));
      return;
    }
    const className = current === null ? "json-null" : typeof current === "string" ? "json-string" : typeof current === "boolean" ? "json-boolean" : "json-number";
    fragment.append(jsonToken(JSON.stringify(current), className, path));
  };
  write(value, "", 0);
  pre.replaceChildren(fragment);
}

async function loadRawJson(relativePath, target) {
  if (!sourceRoot) {
    target.textContent = "Choose the extracted export folder first.";
    return;
  }
  try {
    let directory = sourceRoot;
    const parts = relativePath.split("/");
    for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
    const handle = await directory.getFileHandle(parts.at(-1));
    const text = await (await handle.getFile()).text();
    renderRawJson(JSON.parse(text), target);
    wireCrossReferences();
  } catch {
    target.textContent = "This file was not found below the selected folder. Choose the same extracted-export root that was scanned.";
  }
}

function fileView(id) {
  const current = file(id);
  if (!current) return overview();
  const currentFamily = family(current.familyId);
  const section = element("section");
  const parent = currentFamily.memberIds.length === 1 ? link("← Overview", "overview") : link("← " + currentFamily.name, "family=" + encodeURIComponent(currentFamily.id));
  section.append(parent, element("h1", current.path));
  section.append(element("p", category(current.categoryId).name + " / " + currentFamily.name + " · " + current.status + " · " + current.size.toLocaleString() + " bytes"));
  const raw = element("section");
  raw.className = "raw";
  raw.append(element("h2", "JSON preview"));
  const load = element("button", "Show actual JSON from selected folder");
  const pre = element("pre", "Choose the export folder to preview this file.");
  pre.tabIndex = 0;
  pre.setAttribute("aria-label", "JSON preview for " + current.path);
  load.onclick = () => loadRawJson(current.path, pre);
  raw.append(load, pre);
  if (currentFamily.aggregate) {
    const split = element("div");
    split.className = "split";
    split.append(structure(currentFamily.aggregate), raw);
    section.append(split);
  } else section.append(raw);
  if (sourceRoot) void loadRawJson(current.path, pre);
  return section;
}

function files() {
  const section = element("section");
  section.append(element("h1", "JSON files"));
  const filter = new URLSearchParams(location.hash.split("?")[1] || "").get("status");
  const rows = data.files.filter(item => (!filter || item.status === filter) && matchesSearch(item.path + " " + family(item.familyId).name));
  if (!rows.length) {
    section.append(element("p", "No JSON files match this search or filter."));
    return section;
  }
  const slice = rows.slice(page * 50, page * 50 + 50);
  section.append(table(["Path", "Category", "Family", "Status", "Bytes"], slice.map(item => [
    link(item.path, "file=" + encodeURIComponent(item.id)),
    category(item.categoryId).name,
    family(item.familyId).name,
    item.status,
    item.size.toLocaleString(),
  ])));
  const pagination = element("div");
  pagination.className = "toolbar";
  const previous = element("button", "Previous");
  const next = element("button", "Next");
  previous.disabled = page === 0;
  next.disabled = (page + 1) * 50 >= rows.length;
  previous.onclick = () => { page--; render(); };
  next.onclick = () => { page++; render(); };
  pagination.append(previous, element("span", page * 50 + 1 + "–" + Math.min(page * 50 + 50, rows.length) + " of " + rows.length), next);
  section.append(pagination);
  return section;
}

function diagnostics() {
  const section = element("section");
  section.append(element("h1", "Issues"));
  if (!data.diagnostics.length) {
    section.append(element("p", "No analysis issues."));
    return section;
  }
  section.append(table(["Severity", "Issue", "File"], data.diagnostics.map(item => [
    item.severity,
    item.message,
    item.fileId ? link(file(item.fileId).path, "file=" + encodeURIComponent(item.fileId)) : "—",
  ])));
  return section;
}

function render() {
  app.replaceChildren();
  const [route, id] = (location.hash.slice(1) || "overview").split("=");
  const view = route === "family" ? familyView(decodeURIComponent(id))
    : route === "file" ? fileView(decodeURIComponent(id))
      : route.startsWith("files") ? files()
        : route === "diagnostics" ? diagnostics()
          : overview();
  app.append(view);
  wireCrossReferences();
  status.textContent = data.scan.complete ? "Complete JSON scan" : "Incomplete JSON scan";
  document.querySelectorAll("[data-route]").forEach(item => { item.href = "#" + item.dataset.route; });
}

function folderDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("instagram-inspector", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFolder(handle) {
  try {
    const database = await folderDatabase();
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, "source");
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch { /* Persisting a handle is optional. */ }
}

async function restoreFolder() {
  try {
    const database = await folderDatabase();
    const request = database.transaction("handles").objectStore("handles").get("source");
    const handle = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (handle && await handle.queryPermission({ mode: "read" }) === "granted") {
      sourceRoot = handle;
      folderStatus.textContent = "Reconnected to export folder: " + handle.name + ".";
      render();
    }
  } catch { /* Reconnecting is a convenience, not a requirement. */ }
}

chooseFolderButton.onclick = async () => {
  if (!window.showDirectoryPicker) {
    folderStatus.textContent = "This browser does not support the File System Access API. Open the report in a current Chromium browser.";
    return;
  }
  try {
    sourceRoot = await window.showDirectoryPicker({ mode: "read" });
    await saveFolder(sourceRoot);
    folderStatus.textContent = "Selected export folder: " + sourceRoot.name + ". Actual JSON can now be loaded per file.";
    render();
  } catch {
    folderStatus.textContent = "No export folder selected.";
  }
};

search.oninput = () => { page = 0; render(); };
addEventListener("hashchange", render);
render();
void restoreFolder();
`;

export function renderReport(data: Inventory): string {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Instagram JSON explorer</title>
    <style>${styles}</style>
  </head>
  <body>
    <header><strong>Instagram JSON explorer</strong> <span id="status"></span></header>
    <main>
      <nav>
        <a data-route="overview">Overview</a>
        <a data-route="files">Files</a>
        <a data-route="diagnostics">Issues</a>
        <button id="choose-folder">Choose export folder</button>
        <input id="search" aria-label="Search files, families, and fields" placeholder="Search JSON paths, families, fields">
      </nav>
      <p id="folder-status"></p>
      <section id="app"></section>
    </main>
    <script id="inventory" type="application/json">${safeInventory(data)}</script>
    <script>${client}</script>
  </body>
</html>`;
}
