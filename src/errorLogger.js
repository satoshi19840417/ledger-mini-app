export function initErrorLogger() {
  window.addEventListener('error', e => {
    console.error('window.onerror', e.message, e.error);
  });
  window.addEventListener('unhandledrejection', e => {
    console.error('unhandledrejection', e.reason);
  });
}
