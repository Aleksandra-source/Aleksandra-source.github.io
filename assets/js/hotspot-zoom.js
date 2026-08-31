/* ==========================================================================
   Hotspot zoom — tap a .hotspot-frame to toggle .is-zoomed (desktop already
   gets this on :hover via CSS; touch devices have no hover, so they need a
   tap). Tapping a different frame closes whichever one was open.
   ========================================================================== */
(function () {
  "use strict";

  var open = null;

  document.addEventListener("click", function (e) {
    var frame = e.target.closest(".hotspot-frame");

    if (open && open !== frame) {
      open.classList.remove("is-zoomed");
      open = null;
    }

    if (!frame) return;

    e.preventDefault();
    var isZoomed = frame.classList.toggle("is-zoomed");
    open = isZoomed ? frame : null;
  });
})();
