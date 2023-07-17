export default function decorate(block) {
  const treeview = document.createElement('hlx-aria-treeview');
  treeview.toggleAttribute('is-animated', true);
  treeview.toggleAttribute('is-selectable', block.classList.contains('is-selectable'));
  treeview.toggleAttribute('is-multiselectable', block.classList.contains('is-multiselectable'));
  treeview.onAnimate = ((item, status) => {
    const parent = item.closest('li');
    parent.style.gridTemplateRows = status ? 'min-content 1fr' : 'min-content 0fr';
    parent.style.transitionDelay = status ? '0s' : '.15s';
    const groupId = item.getAttribute('aria-owns');
    if (groupId) {
      const group = treeview.querySelector(`#${groupId}`);
      group.style.opacity = status ? 1 : 0;
      group.style.transitionDelay = status ? '.15s' : '0s';
    }
  });
  treeview.decorate(block);
}
