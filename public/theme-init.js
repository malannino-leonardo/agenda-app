// Applies the saved theme / UI scale before first paint (avoids a flash).
// Kept as an external file so the CSP can forbid inline scripts (script-src 'self').
(function () {
  try {
    var theme = localStorage.getItem('agenda_theme');
    var metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#ffffff');
    } else {
      document.documentElement.style.colorScheme = 'dark';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#09090b');
    }
    if ('zoom' in document.documentElement.style) {
      document.documentElement.style.removeProperty('zoom');
    }
    var scale = localStorage.getItem('agenda_ui_scale');
    if (scale) {
      var val = parseInt(scale, 10);
      if (!isNaN(val) && val >= 85 && val <= 140 && val !== 100) {
        document.documentElement.style.fontSize = val + '%';
      }
    }
  } catch (e) {}
})();
