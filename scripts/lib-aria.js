import { decorateBlock, toCamelCase } from './lib-franklin.js';

export function getId(prefix = 'hlx') {
  return `${prefix}-${Math.random().toString(32).substring(2)}`;
}

class AriaWidget extends HTMLElement {

  connectedCallback() {
    this.attachListeners && this.attachListeners();
    this.constructor.observedAttributes?.forEach((attr) => {
      this[`_${toCamelCase(attr)}`] = !!this.attributes[attr];
    });
  }

  dicsconnectedCallback() {
    this.detachListeners && this.detachListeners();
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
      collapse.textContent =  this.attributes.collapseAllLabel?.value || 'Collapse All';
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
      ? new Promise((resolve) => window.requestAnimationFrame(resolve))
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
    const ol = document.createElement('ol');
    anchors.forEach((a) => {
      const li = document.createElement('li');
      a.removeAttribute('class');
      if (new URL(a.href).pathname === window.location.pathname) {
        a.setAttribute('aria-current', 'page');
      }
      li.append(a);
      ol.append(li);
    })
    this.append(ol);
    block.innerHTML = '';
    block.append(this);
    return this;
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
      ? new Promise((resolve) => window.requestAnimationFrame(resolve))
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

export default {
  Accordion: AriaAccordion,
  Tabs: AriaTabs,
}
