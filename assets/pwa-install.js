let deferredPrompt;
const installBtn = document.getElementById('pwaInstallBtn');
const iosHint   = document.getElementById('iosHint');

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = () => /iPhone|iPad|iPod/.test(window.navigator.userAgent);

if (!localStorage.getItem('pwa_installed') && !isStandalone()) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    deferredPrompt?.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.hidden = true;
      localStorage.setItem('pwa_installed', '1');
    }
    deferredPrompt = null;
  });

  if (isIOS() && !isStandalone()) iosHint.hidden = false;
}
