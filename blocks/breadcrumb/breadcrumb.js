export default function decorate(block) {
  const breadcrumb = document.createElement('hlx-aria-breadcrumb');
  breadcrumb.label = 'Navigation';
  breadcrumb.description = 'The navigation widget';
  breadcrumb.decorate(block);
}
