// Renderer startup only. No save access, simulation stepping, or game controls.
export function createStartupRenderer(create, doc = document, reload = () => window.location.reload()) {
  try { return create(); }
  catch (error) {
    console.error('Graphics initialization failed', error);
    const screen = doc.createElement('section');
    screen.id = 'startup-error';
    screen.setAttribute('role', 'alert');
    screen.setAttribute('aria-labelledby', 'startup-error-title');
    screen.innerHTML = `<div class="startup-card">
      <p class="startup-brand">Self Storage Tycoon</p>
      <h1 id="startup-error-title" tabindex="-1">Graphics could not start</h1>
      <p>This browser could not initialize the game’s 3D graphics (WebGL).</p>
      <p>Try reloading once. If this keeps happening, use a browser or device with WebGL available. On a PC, check that graphics acceleration is available in your browser.</p>
      <p>The game has not started. This failure has not changed your saved games. Keep your browser’s site data to retain browser saves.</p>
      <button type="button">Reload game</button>
    </div>`;
    screen.querySelector('button').addEventListener('click', reload);
    doc.body.appendChild(screen);
    screen.querySelector('h1').focus();
    return null;
  }
}
