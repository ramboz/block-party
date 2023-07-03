import { decorateBlock, toCamelCase } from './lib-franklin.js';

export function getId(prefix = 'hlx') {
  return `${prefix}-${Math.random().toString(32).substring(2)}`;
}

class AriaWidget extends HTMLElement {

  connectedCallback() {
    this.attachListeners && this.attachListeners();
    this.constructor.observedAttributes.forEach((attr) => {
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

  set desciption(stringOrEl) {
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

export default {
  Accordion: AriaAccordion,
}
