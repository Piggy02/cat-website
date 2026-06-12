// Simple visual password gate. Note: this only deters casual visitors —
// the password lives in this public file and is not real access control.
(function () {
  const PASSWORD = '9zKZZLre#knqQK7PR6H#$h7YK3xvKCC%TWbkKsHZF@&GusFzF@Rp4';
  const STORAGE_KEY = 'catSiteAccess';

  if (localStorage.getItem(STORAGE_KEY) === 'granted') return;

  document.documentElement.style.visibility = 'hidden';

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.className = 'pass-gate';
    overlay.innerHTML = `
      <div class="pass-box">
        <h2>🔒 Private Site</h2>
        <p>Enter the password to continue.</p>
        <input type="password" id="passInput" autocomplete="off" />
        <button id="passSubmit">Enter</button>
        <p class="pass-error" id="passError" hidden>Incorrect password, try again.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = 'visible';

    const input = overlay.querySelector('#passInput');
    const error = overlay.querySelector('#passError');

    function tryUnlock() {
      if (input.value === PASSWORD) {
        localStorage.setItem(STORAGE_KEY, 'granted');
        overlay.remove();
      } else {
        error.hidden = false;
        input.value = '';
        input.focus();
      }
    }

    overlay.querySelector('#passSubmit').addEventListener('click', tryUnlock);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryUnlock();
    });
    input.focus();
  });
})();
