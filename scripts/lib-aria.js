/* eslint-disable no-underscore-dangle */
// eslint-disable-next-line max-classes-per-file
import { toCamelCase } from './lib-franklin.js';

export function getId(prefix = 'hlx') {
  return `${prefix}-${Math.random().toString(32).substring(2)}`;
}

class AriaWidget extends HTMLElement {
  connectedCallback() {
    if (this.attachListeners) this.attachListeners();
    this.constructor.observedAttributes?.forEach((attr) => {
      this[`_${toCamelCase(attr)}`] = !!this.attributes[attr];
    });
  }

  dicsconnectedCallback() {
    if (this.attachListeners) this.detachListeners();
  }

  decorate(block) {
    const html = block.innerHTML;
    block.replaceWith(this);
    this.innerHTML = html;
    return this;
  }

  set label(stringOrEl) {
    if (typeof stringOrEl === 'string') {
      this.setAttribute('aria-label', stringOrEl);
    } else {
      if (!stringOrEl.id) {
        stringOrEl.id = getId();
      }
      this.setAttribute('aria-labelledby', stringOrEl.id);
    }
  }

  set description(stringOrEl) {
    if (typeof stringOrEl === 'string') {
      this.setAttribute('aria-description', stringOrEl);
    } else {
      if (!stringOrEl.id) {
        stringOrEl.id = getId();
      }
      this.setAttribute('aria-describedby', stringOrEl.id);
    }
  }
}

class AriaAccordion extends AriaWidget {
  static get observedAttributes() { return ['is-animated', 'single', 'with-controls']; }

  attributeChangedCallback(attr, oldValue, newValue) {
    this[`_${toCamelCase(attr)}`] = newValue !== 'false';
  }

  attachListeners() {
    this._clickListener = async (ev) => {
      const summary = ev.target.closest('summary');
      const button = ev.target.closest('button[aria-controls][data-role]');
      if (!summary && !button) {
        return;
      }
      if (summary) {
        const details = summary.closest('details');
        if (details.open && this._isAnimated) {
          ev.preventDefault();
        }
        this.toggleItem(details, !details.open);
      } else if (button) {
        this.querySelectorAll('details').forEach((details) => {
          const open = button.dataset.role === 'expand';
          if (open) {
            details.open = true;
          }
          this.toggleItem(details, open);
        });
      }
    };
    this.addEventListener('click', this._clickListener);
  }

  detachListeners() {
    this.removeEventListener(this._clickListener);
  }

  decorate(block) {
    if (!block.childElementCount) {
      throw new Error('An accordion needs at least 1 item');
    }
    if (block.firstElementChild.childElementCount === 1) {
      [...block.children].forEach((el, i) => {
        if (i % 2) {
          this.addItem(el.previousElementSibling, el);
        }
      });
    } else {
      [...block.children].forEach((el) => {
        if (el.childElementCount === 2) {
          this.addItem(el.children[0], el.children[1]);
        } else if (el.childElementCount === 3) {
          this.addItem(el.children[1], el.children[2], el.children[0].querySelector('picture'));
        }
        el.before(el.children[0]);
        el.before(el.children[0]);
        el.remove();
      });
    }
    if (this._withControls && !this._single) {
      const ids = [...this.querySelectorAll('details')].map((el) => {
        if (!el.id) {
          el.id = getId('accordion');
        }
        return el.id;
      }).join(' ');
      const div = document.createElement('div');
      div.setAttribute('role', 'group');
      const expand = document.createElement('button');
      expand.setAttribute('aria-controls', ids);
      expand.dataset.role = 'expand';
      expand.textContent = this.attributes.expandAllLabel?.value || 'Expand All';
      div.append(expand);
      const collapse = document.createElement('button');
      collapse.setAttribute('aria-controls', ids);
      collapse.dataset.role = 'collapse';
      collapse.textContent = this.attributes.collapseAllLabel?.value || 'Collapse All';
      collapse.disabled = true;
      div.append(collapse);
      this.prepend(div);
    }
    block.innerHTML = '';
    block.append(this);
    return this;
  }

  addItem(titleEl, panelEl, imgEl) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    if (imgEl) {
      summary.append(imgEl);
    }
    summary.append(titleEl);
    details.append(summary);
    const panelWrapper = document.createElement('div');
    panelWrapper.append(panelEl);
    details.append(panelWrapper);
    this.append(details);
  }

  // eslint-disable-next-line class-methods-use-this
  removeItem(item) {
    item.closest('details').remove();
  }

  async toggleItem(item, state) {
    if (this._single && state) {
      this.querySelectorAll('details[open]').forEach((details) => {
        this.toggleItem(details, false);
      });
    }

    await (this._isAnimated
      ? new Promise((resolve) => { window.requestAnimationFrame(resolve); })
      : Promise.resolve());
    if (!state && this._isAnimated) {
      item.addEventListener('transitionend', async () => {
        item.open = false;
        if (!this._single && this._withControls) {
          const details = [...this.querySelectorAll('details')];
          this.querySelector('[data-role="expand"]').toggleAttribute('disabled', details.every((d) => d.open));
          this.querySelector('[data-role="collapse"]').toggleAttribute('disabled', details.every((d) => !d.open));
        }
      }, { once: true });
      await this.onAnimate(item, false);
    } else {
      this.onAnimate(item, true);
      if (!this._single && this._withControls) {
        const details = [...this.querySelectorAll('details')];
        this.querySelector('[data-role="expand"]').toggleAttribute('disabled', details.every((d) => d.open));
        this.querySelector('[data-role="collapse"]').toggleAttribute('disabled', details.every((d) => !d.open));
      }
    }
  }
}
customElements.define('hlx-aria-accordion', AriaAccordion);

class AriaBreadcrumb extends AriaWidget {
  decorate(block) {
    this.setAttribute('role', 'navigation');
    const anchors = block.querySelectorAll('a[href]');
    this.list = document.createElement('ol');
    anchors.forEach((a) => {
      this.addItem(a);
    });
    this.append(this.list);
    block.innerHTML = '';
    block.append(this);
    return this;
  }

  addItem(anchor) {
    const li = document.createElement('li');
    anchor.removeAttribute('class');
    if (new URL(anchor.href).pathname === window.location.pathname) {
      anchor.setAttribute('aria-current', 'page');
    }
    li.append(anchor);
    this.list.append(li);
  }
}
customElements.define('hlx-aria-breadcrumb', AriaBreadcrumb);

class AriaTabs extends AriaWidget {
  static get observedAttributes() { return ['auto-select', 'is-animated', 'is-vertical']; }

  attributeChangedCallback(attr, oldValue, newValue) {
    this[`_${toCamelCase(attr)}`] = newValue !== 'false';
  }

  attachListeners() {
    this._clickListener = async (ev) => {
      const tab = ev.target.closest('[role="tab"]');
      if (!tab) {
        return;
      }
      ev.preventDefault();
      if (tab.getAttribute('aria-selected') !== 'true') {
        this.selectItem(tab);
      }
    };
    this._keyListener = async (ev) => {
      const tab = ev.target.closest('[role="tab"]');
      if (!tab) {
        return;
      }
      const tabs = [...this.tablist.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(tab);
      const fn = this._autoSelect ? this.selectItem : this.focusItem;
      switch (ev.key) {
        case 'Home':
          ev.preventDefault();
          fn.call(this, tabs[0]);
          break;
        case 'ArrowLeft':
          if (!this._isVertical) {
            ev.preventDefault();
            fn.call(this, index ? tabs[index - 1] : tabs[tabs.length - 1]);
          }
          break;
        case 'ArrowRight':
          if (!this._isVertical) {
            ev.preventDefault();
            fn.call(this, (index === tabs.length - 1) ? tabs[0] : tabs[index + 1]);
          }
          break;
        case 'ArrowUp':
          if (this._isVertical) {
            ev.preventDefault();
            fn.call(this, index ? tabs[index - 1] : tabs[tabs.length - 1]);
          }
          break;
        case 'ArrowDown':
          if (this._isVertical) {
            ev.preventDefault();
            fn.call(this, (index === tabs.length - 1) ? tabs[0] : tabs[index + 1]);
          }
          break;
        case 'End':
          ev.preventDefault();
          fn.call(this, tabs[tabs.length - 1]);
          break;
        default:
          break;
      }
    };
    this.addEventListener('click', this._clickListener);
    this.addEventListener('keydown', this._keyListener);
  }

  detachListeners() {
    this.removeEventListener(this._clickListener);
    this.removeEventListener(this._keyListener);
  }

  decorate(block) {
    if (!block.childElementCount) {
      throw new Error('A tabs widget needs at least 1 item');
    }
    this.tablist = document.createElement('ul');
    this.tablist.setAttribute('role', 'tablist');
    this.tablist.setAttribute('aria-orientation', this._isVertical ? 'vertical' : 'horizontal');
    this.append(this.tablist);
    this.tabpanels = document.createElement('div');
    this.append(this.tabpanels);
    if (block.firstElementChild.childElementCount === 1) {
      let tabs = block.firstElementChild.firstElementChild.querySelectorAll('a');
      let tabPanels = [...block.children].slice(tabs.length ? 1 : 0);
      if (!tabs.length) {
        tabs = tabPanels.map((panel) => {
          const a = document.createElement('a');
          const heading = panel.querySelector('h1,h2,h3,h4,h5,h6');
          a.href = `#${heading.id}`;
          a.innerHTML = heading.innerHTML;
          return a;
        });
      }
      if (!tabPanels.length) {
        const section = block.closest('.section');
        tabPanels = [];
        let next = section.nextElementSibling;
        while (next?.dataset.tabPanel) {
          tabPanels.push(next.firstElementChild);
          next = next.nextElementSibling;
        }
      }
      if (tabPanels.length !== tabs.length) {
        throw new Error('Inconsistent number of tabs and tab panels.');
      }
      tabs.forEach((tab, i) => {
        const div = document.createElement('div');
        div.append(tabPanels[i]);
        this.addItem(tab, div);
      });
    }
    block.innerHTML = '';
    block.append(this);
    this.selectItem(this.querySelector('[role="tab"]'));
    return this;
  }

  addItem(titleEl, panelEl) {
    const li = document.createElement('li');
    li.setAttribute('role', 'presentation');
    titleEl.setAttribute('role', 'tab');
    titleEl.setAttribute('tabindex', -1);
    if (!titleEl.id) {
      titleEl.id = getId('tab');
    }
    li.append(titleEl);
    this.tablist.append(li);
    panelEl.setAttribute('role', 'tabpanel');
    if (!panelEl.id) {
      panelEl.id = getId('tabpanel');
    }
    titleEl.setAttribute('aria-controls', panelEl.id);
    panelEl.setAttribute('aria-labelledby', titleEl.id);
    panelEl.toggleAttribute('hidden', true);
    this.tabpanels.append(panelEl);
  }

  removeItem(item) {
    this.querySelector(`[aria-labbeledby=${item.id}]`).remove();
    item.remove();
  }

  focusItem(item) {
    this.tablist.querySelector('[tabindex="0"]')?.setAttribute('tabindex', -1);
    item.setAttribute('tabindex', 0);
    item.focus();
  }

  async selectItem(item) {
    this.focusItem(item);
    await (this._isAnimated
      ? new Promise((resolve) => { window.requestAnimationFrame(resolve); })
      : Promise.resolve());
    const currentTab = this.querySelector('[role="tab"][aria-selected="true"]');
    const currentPanel = this.querySelector('[role="tabpanel"]:not([hidden])');
    if (currentTab && currentPanel) {
      currentTab.setAttribute('aria-selected', false);
      if (this._isAnimated) {
        currentPanel.addEventListener('transitionend', async () => {
          currentPanel.toggleAttribute('hidden', true);
        }, { once: true });
        this.onAnimate(currentTab, false);
      } else {
        currentPanel.toggleAttribute('hidden', true);
      }
    }

    const newPanel = this.querySelector(`#${item.getAttribute('aria-controls')}`);
    item.setAttribute('aria-selected', true);
    newPanel.toggleAttribute('hidden', false);
    if (this._isAnimated) {
      window.requestAnimationFrame(() => {
        this.onAnimate(item, true);
      });
    }
  }
}
customElements.define('hlx-aria-tabs', AriaTabs);

class AriaTreeView extends AriaWidget {
  static get observedAttributes() { return ['is-animated', 'is-selectable', 'is-multiselectable', 'with-controls']; }

  attributeChangedCallback(attr, oldValue, newValue) {
    this[`_${toCamelCase(attr)}`] = newValue !== 'false';
  }

  attachListeners() {
    this._clickListener = async (ev) => {
      const toggle = ev.target.closest('button[aria-controls]');
      const item = ev.target.closest('span[role="treeitem"]');
      if (!toggle && !item) {
        return;
      }
      ev.preventDefault();
      if (toggle) {
        const itemId = toggle.getAttribute('aria-controls');
        this.toggleItem(this.querySelector(`#${itemId}`));
      }
      if (item && this._isSelectable) {
        this.toggleSelection(item, true);
      } else if (item && this._isMultiselectable) {
        this.toggleSelection(item);
      }
      if (item) {
        this.toggleItem(item);
      }
    };
    this._keyListener = async (ev) => {
      const item = ev.target.closest('[role="treeitem"]');
      if (!item) {
        return;
      }
      const focusables = [...this.querySelectorAll('[role="treeitem"]')]
        .filter((i) => {
          const group = i.closest('[role="group"]');
          if (!group) {
            return true;
          }
          return this.querySelector(`[aria-owns="${group.id}"]`).getAttribute('aria-expanded') === 'true';
        });
      const index = focusables.indexOf(item);
      const group = ev.target.closest('[role="group"],[role="tree"]');
      switch (ev.key) {
        case 'ArrowUp':
          ev.preventDefault();
          this.focusItem(index ? focusables[index - 1] : focusables[focusables.length - 1]);
          break;
        case 'ArrowDown':
          ev.preventDefault();
          this.focusItem(index === focusables.length - 1 ? focusables[0] : focusables[index + 1]);
          break;
        case 'ArrowRight': {
          ev.preventDefault();
          if (item.getAttribute('aria-expanded') === 'false') {
            this.toggleItem(item, true);
          } else if (item.getAttribute('aria-owns')) {
            this.focusItem(focusables[index + 1]);
          }
          break;
        }
        case 'ArrowLeft':
          ev.preventDefault();
          if (item.getAttribute('aria-expanded') === 'true') {
            this.toggleItem(item, false);
          } else if (group?.id) {
            this.focusItem(this.querySelector(`[aria-owns="${group.id}`));
          }
          break;
        case 'Home':
          ev.preventDefault();
          this.focusItem(focusables[0]);
          break;
        case 'End':
          ev.preventDefault();
          this.focusItem(focusables[focusables.length - 1]);
          break;
        case ' ':
          if (this._isSelectable || this._isMultiselectable) {
            ev.preventDefault();
            this.toggleSelection(item);
          }
          break;
        default:
          break;
      }
    };
    this.addEventListener('click', this._clickListener);
    this.addEventListener('keydown', this._keyListener);
  }

  detachListeners() {
    this.removeEventListener(this._clickListener);
    this.removeEventListener(this._keyListener);
  }

  decorate(block) {
    if (!block.childElementCount) {
      throw new Error('A tree view widget needs at least 1 item');
    }

    this.root = block.querySelector('ul,ol');
    this.root.setAttribute('role', 'tree');
    this.root.setAttribute('aria-multiselectable', this._isMultiselectable || 'false');
    this.root.setAttribute('aria-orientation', 'vertical');
    this.append(this.root);

    const groups = this.root.querySelectorAll('ul,ol');
    groups.forEach((group) => {
      group.setAttribute('role', 'group');
    });
    const listItems = this.root.querySelectorAll('li');
    listItems.forEach((li) => {
      li.setAttribute('role', 'none');
      if (!li.firstElementChild || ['UL', 'OL'].includes(li.firstElementChild.tagName)) {
        const group = li.querySelector('ul,ol');
        if (group) group.remove();
        const span = document.createElement('span');
        span.innerHTML = li.innerHTML;
        li.innerHTML = '';
        li.append(span);
        if (group) span.after(group);
      }
    });
    this.root.querySelectorAll('li>a,li>span').forEach((item) => {
      const group = item.closest('[role="group"]');
      let parentItem;
      if (group) {
        parentItem = group.parentElement.firstElementChild;
      }
      this.addItem(item, parentItem);
    });

    block.innerHTML = '';
    block.append(this);

    this.focusItem(this.root.querySelector('[role="treeitem"]'));
    return this;
  }

  addItem(item, parentItem) {
    let parentGroup;
    if (parentItem) {
      if (!parentItem.getAttribute('aria-owns')) {
        this.addGroup(parentItem);
      }
      parentGroup = this.querySelector(`#${parentItem.getAttribute('aria-owns')}`);
    } else {
      parentGroup = this;
    }
    item.setAttribute('role', 'treeitem');
    if (!item.id) {
      item.id = getId('treeitem');
    }
    item.setAttribute('tabindex', -1);
    if (this._isSelectable) {
      item.setAttribute('aria-selected', false);
    }
    if (this._isMultiselectable) {
      item.setAttribute('aria-checked', false);
    }
    if (!item.closest('[role="tree"]')) {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      li.append(item);
      parentGroup.append(li);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  addGroup(item) {
    let group;
    if (['UL', 'OL'].includes(item.nextElementSibling.tagName)) {
      group = item.nextElementSibling;
    } else {
      group = document.createElement('ul');
      item.after(group);
    }
    group.id = getId('group');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', item.id);
    group.toggleAttribute('hidden', true);
    item.setAttribute('aria-expanded', 'false');
    item.setAttribute('aria-owns', group.id);
    if (item.tagName === 'A') {
      const toggle = document.createElement('button');
      toggle.setAttribute('aria-controls', item.id);
      toggle.setAttribute('tabindex', -1);
      item.after(toggle);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  removeItem(item) {
    item.closest('li').remove();
  }

  focusItem(item) {
    const oldItem = this.querySelector('[role="treeitem"][tabindex="0"]');
    if (oldItem) {
      oldItem.setAttribute('tabindex', -1);
    }
    let group = item.closest('[role="group"]');
    while (group) {
      const parentItem = this.querySelector(`[aria-owns="${group.id}"`);
      if (parentItem.getAttribute('aria-expanded') === 'false') {
        this.toggleItem(parentItem, true);
      }
      group = parentItem.closest('[role="group"]');
    }
    item.setAttribute('tabindex', 0);
    item.focus();
  }

  // eslint-disable-next-line class-methods-use-this
  async toggleItem(item, status) {
    if (!item.getAttribute('aria-expanded')) {
      return;
    }
    const expanded = status === undefined
      ? item.getAttribute('aria-expanded') === 'false'
      : status;

    await (this._isAnimated
      ? new Promise((resolve) => { window.requestAnimationFrame(resolve); })
      : Promise.resolve());

    const groupId = item.getAttribute('aria-owns');
    const group = groupId ? this.root.querySelector(`#${groupId}`) : null;
    if (groupId) {
      this.root.querySelector(`#${groupId}`)
        .querySelectorAll('[role="treeitem"][aria-expanded="true"]').forEach((i) => {
          this.toggleItem(i, false);
        });
    }

    if (this._isAnimated) {
      if (expanded) {
        item.setAttribute('aria-expanded', true);
        group.toggleAttribute('hidden', false);
        window.requestAnimationFrame(() => {
          this.onAnimate(item, true);
        });
      } else {
        (group || this.root).addEventListener('transitionend', async () => {
          item.setAttribute('aria-expanded', false);
          group.toggleAttribute('hidden', true);
        }, { once: true });
        this.onAnimate(item, false);
      }
    } else {
      item.setAttribute('aria-expanded', expanded);
      group.toggleAttribute('hidden', !expanded);
    }
  }

  async toggleSelection(item, status) {
    this.focusItem(item);

    const attribute = this._isMultiselectable ? 'aria-checked' : 'aria-selected';
    const selected = status === undefined
      ? item.getAttribute(attribute) === 'false'
      : status;
    if (this._isSelectable) {
      const selectedItem = this.querySelector('[role="treeitem"][aria-selected="true"]');
      if (selectedItem && item !== selectedItem) {
        await this.toggleSelection(selectedItem, false);
      }
    }

    item.setAttribute(attribute, selected);
  }
}
customElements.define('hlx-aria-treeview', AriaTreeView);

export default {
  Accordion: AriaAccordion,
  Tabs: AriaTabs,
  TreeView: AriaTreeView,
};
