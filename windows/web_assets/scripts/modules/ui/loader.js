export async function loadViews() {
  const app = document.getElementById('app');

  const manifest = await fetch('pages/manifest.json').then(r => r.json());

  const fetches = manifest.map(name =>
    fetch(`pages/${name}.html`).then(res => res.text())
  );

  const htmlFragments = await Promise.all(fetches);
  app.innerHTML = htmlFragments.join('\n');
}
