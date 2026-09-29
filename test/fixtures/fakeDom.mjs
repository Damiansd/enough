// A stand-in DOM, just large enough for the chat panel (`chat/chatPanel.ts`), the month table
// (`renderTable.ts`) and its anchors (`monthAnchors.ts`) to run under `node:test`. `typescript` is the
// one dev dependency (TODO.md P2-9a), so there is no jsdom. What it does not do, stated plainly: it
// parses no markup (`innerHTML` is kept as the string it was given, and tests read that string), it
// lays nothing out, and a selector is one compound (`tag.class#id`), never a descendant chain.

class FakeText {
  constructor(text) {
    this.data = String(text);
    this.parentNode = null;
  }
  get textContent() {
    return this.data;
  }
}

export class FakeEvent {
  constructor(type) {
    this.type = type;
    this.target = null;
    this.defaultPrevented = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

const COMPOUND = /^([a-z0-9]*)((?:\.[\w-]+)*)(?:#([\w-]+))?$/i;

const decoded = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

export class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.type = '';
    this.listeners = {};
    this.classes = new Set();
    this.html = null;
  }
  get children() {
    return this.childNodes.filter((node) => node instanceof FakeElement);
  }
  get firstElementChild() {
    return this.children[0] ?? null;
  }
  get className() {
    return [...this.classes].join(' ');
  }
  set className(value) {
    this.classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }
  get classList() {
    const classes = this.classes;
    return {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    };
  }
  get id() {
    return this.attributes.get('id') ?? '';
  }
  set id(value) {
    this.attributes.set('id', String(value));
  }
  setAttribute(name, value) {
    if (name === 'class') this.className = value;
    else this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return name === 'class' ? this.className : (this.attributes.get(name) ?? null);
  }
  adopt(node) {
    const child = typeof node === 'string' ? new FakeText(node) : node;
    if (child.parentNode) child.parentNode.childNodes = child.parentNode.childNodes.filter((each) => each !== child);
    child.parentNode = this;
    return child;
  }
  append(...nodes) {
    this.html = null;
    for (const node of nodes) this.childNodes.push(this.adopt(node));
  }
  replaceChildren(...nodes) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    this.html = null;
    this.append(...nodes);
  }
  remove() {
    if (this.parentNode) this.parentNode.childNodes = this.parentNode.childNodes.filter((each) => each !== this);
    this.parentNode = null;
  }
  get textContent() {
    return this.html !== null ? decoded(this.html) : this.childNodes.map((node) => node.textContent).join('');
  }
  set textContent(value) {
    this.replaceChildren();
    if (String(value) !== '') this.append(String(value));
  }
  get innerHTML() {
    return this.html ?? '';
  }
  set innerHTML(value) {
    this.replaceChildren();
    this.html = String(value);
  }
  addEventListener(type, listener) {
    (this.listeners[type] ??= []).push(listener);
  }
  /** Bubbles from this element up; returns what every listener returned, so a test can await an async one. */
  dispatch(event) {
    event.target ??= this;
    const results = [];
    for (let node = this; node !== null; node = node.parentNode) {
      for (const listener of node.listeners?.[event.type] ?? []) results.push(listener.call(node, event));
    }
    return results;
  }
  click() {
    if (!this.disabled) this.dispatch(new FakeEvent('click'));
  }
  /** Click, and wait for every listener it ran. */
  async clicked() {
    if (this.disabled) throw new Error('a disabled button was clicked');
    const event = new FakeEvent('click');
    await Promise.all(this.dispatch(event));
    return event;
  }
  matches(selector) {
    const [, tag, classes, id] = COMPOUND.exec(selector) ?? [];
    if (tag === undefined) throw new Error(`the stand-in DOM reads one compound selector, not "${selector}"`);
    if (tag !== '' && this.tagName !== tag.toUpperCase()) return false;
    if (id !== undefined && this.id !== id) return false;
    return classes.split('.').filter(Boolean).every((name) => this.classes.has(name));
  }
  closest(selector) {
    for (let node = this; node instanceof FakeElement; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }
  descendants() {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
  querySelectorAll(selector) {
    return this.descendants().filter((each) => each.matches(selector));
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  scrollIntoView() {
    this.scrolledIntoView = true;
  }
}

/** A document with an empty body, installed as `globalThis.document`; `uninstall` puts the old one back. */
export const installDocument = () => {
  const previous = globalThis.document;
  const body = new FakeElement('body');
  const document = {
    body,
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => body.descendants().find((each) => each.id === id) ?? null,
    querySelectorAll: (selector) => body.querySelectorAll(selector),
    querySelector: (selector) => body.querySelector(selector),
  };
  globalThis.document = document;
  return { document, uninstall: () => (previous === undefined ? delete globalThis.document : (globalThis.document = previous)) };
};

/** Every element under `root` whose own text is `text`: how a test finds a button by its label. */
export const byText = (root, text) => root.descendants().filter((each) => each.textContent === text);
