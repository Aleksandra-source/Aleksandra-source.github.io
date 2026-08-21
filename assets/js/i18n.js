/* ==========================================================================
   i18n — RU/EN toggle. Initial locale is set inline in <head> (before paint);
   this module wires up the visible toggle buttons after DOM is ready.
   ========================================================================== */
(function () {
  "use strict";

  function currentLocale() {
    return document.documentElement.getAttribute("data-locale") || "ru";
  }

  function setLocale(locale) {
    document.documentElement.setAttribute("data-locale", locale);
    document.documentElement.setAttribute("lang", locale);
    try { localStorage.setItem("locale", locale); } catch (e) {}
    syncButtons();
    document.dispatchEvent(new CustomEvent("localechange", { detail: { locale } }));
  }

  function syncButtons() {
    var loc = currentLocale();
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      var pressed = btn.getAttribute("data-lang-btn") === loc;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
  }

  function init() {
    syncButtons();
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLocale(btn.getAttribute("data-lang-btn"));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
