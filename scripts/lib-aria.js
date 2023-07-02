export function getId(prefix = 'hlx') {
  return `${prefix}-${Math.random().toString(32).substring(2)}`;
}

class AriaAccordion extends HTMLElement {
  connectedCallback() {
    this.attachListeners();
    this.decorate();
    this.shadowRoot = elementRef.attachShadow({ mode: 'open' });
  }

  dicsconnectedCallback() {
    this.detachListeners();
  }

  attachListeners() {}

  detachListeners() {}

  decorate() {

  }

  addItem(title, panel) {}

  removeItem() {}

  focusItem() {}

  selectItem() {}
}