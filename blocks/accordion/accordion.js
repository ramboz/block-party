export default function decorate(block) {
  const accordion = document.createElement('hlx-aria-accordion');
  accordion.toggleAttribute('is-animated', true);
  accordion.toggleAttribute('single', block.classList.contains('single-item'));
  accordion.toggleAttribute('with-controls', block.classList.contains('with-controls'));
  accordion.onAnimate = (item, open) => {
    item.querySelector('summary + div').style.gridTemplateRows = open ? '1fr' : '0fr';
  };
  accordion.decorate(block);
}
