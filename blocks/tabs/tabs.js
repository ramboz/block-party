export default function decorate(block) {
  const tabs = document.createElement('hlx-aria-tabs');
  tabs.toggleAttribute('is-animated', true);
  tabs.toggleAttribute('auto-select', block.classList.contains('auto'));
  tabs.toggleAttribute('is-vertical', block.classList.contains('vertical'));
  tabs.onAnimate = (item, open) => {
    const panel = block.querySelector(`#${item.getAttribute('aria-controls')}`);
    if (open) {
      panel.style.gridTemplateRows = '1fr';
    } else {
      panel.style.gridTemplateRows = '0fr';
    }
  };
  tabs.decorate(block);
}
