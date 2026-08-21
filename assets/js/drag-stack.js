/* ==========================================================================
   Travel card stack — pointer-drag swipe, Tinder-style.
   The front card follows the pointer; releasing past the threshold flies
   it off-screen, sends it to the back of the array, and the next card
   becomes active. Loops indefinitely through all cards.
   ========================================================================== */
(function () {
  "use strict";

  var stack = document.getElementById("travel-stack");
  if (!stack) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var order = Array.prototype.slice.call(stack.querySelectorAll(".drag-card"));
  var SNAP_MS = reduceMotion ? 1 : 320;
  var FLY_MS = reduceMotion ? 1 : 340;
  var THRESHOLD = 70;
  var VISIBLE = 3;

  function baseTransform(i) {
    if (i === 0) return "translate(0,0) rotate(0deg) scale(1)";
    if (i === 1) return "translate(10px,10px) rotate(6deg) scale(0.98)";
    return "translate(-10px,14px) rotate(-6deg) scale(0.96)";
  }

  function layout(withTransition) {
    order.forEach(function (card, i) {
      card.style.transition = withTransition ? "transform " + SNAP_MS + "ms var(--ease-out)" : "none";
      if (i >= VISIBLE) {
        card.style.opacity = "0";
        card.style.zIndex = "0";
        card.style.pointerEvents = "none";
      } else {
        card.style.opacity = "1";
        card.style.zIndex = String(VISIBLE - i);
        card.style.pointerEvents = i === 0 ? "auto" : "none";
        card.style.transform = baseTransform(i);
      }
    });
  }
  layout(false);

  var dragging = false;
  var startX = 0;
  var startY = 0;
  var dx = 0;

  function front() { return order[0]; }

  stack.addEventListener("pointerdown", function (e) {
    if (front() !== e.target.closest(".drag-card")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    var card = front();
    card.classList.add("is-dragging");
    card.setPointerCapture(e.pointerId);
  });

  stack.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    var dy = e.clientY - startY;
    var rot = dx / 18;
    front().style.transform = "translate(" + dx + "px," + dy * 0.3 + "px) rotate(" + rot + "deg) scale(1)";
  });

  function release(e) {
    if (!dragging) return;
    dragging = false;
    var card = front();
    card.classList.remove("is-dragging");

    if (Math.abs(dx) > THRESHOLD) {
      var dir = dx > 0 ? 1 : -1;
      card.style.transition = "transform " + FLY_MS + "ms var(--ease-out), opacity " + FLY_MS + "ms var(--ease-out)";
      card.style.transform = "translate(" + dir * 500 + "px,80px) rotate(" + dir * 24 + "deg) scale(0.94)";
      card.style.opacity = "0";
      setTimeout(function () {
        order.push(order.shift());
        layout(false);
      }, FLY_MS);
    } else {
      card.style.transition = "transform " + SNAP_MS + "ms var(--ease-out)";
      card.style.transform = baseTransform(0);
    }
  }

  ["pointerup", "pointercancel"].forEach(function (evt) {
    stack.addEventListener(evt, release);
  });

  // Prevent the drag from being interpreted as a click on the underlying image
  stack.addEventListener(
    "click",
    function (e) {
      if (Math.abs(dx) > 4) { e.preventDefault(); e.stopPropagation(); }
    },
    true
  );
})();
