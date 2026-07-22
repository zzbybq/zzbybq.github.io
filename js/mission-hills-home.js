(function () {
  "use strict";

  var carousel = document.querySelector("[data-home-carousel]");
  var slides = document.querySelector("[data-home-slides]");
  var status = document.querySelector("[data-home-status]");
  if (!carousel || !slides) return;

  var count = slides.children.length;
  var activeIndex = 0;
  var startX = 0;
  var currentX = 0;
  var dragging = false;

  function setPosition(offset, animate) {
    carousel.classList.toggle("is-dragging", !animate);
    slides.style.transform = "translate3d(" + (-activeIndex * 100 + offset) + "%,0,0)";
  }

  function show(index) {
    activeIndex = Math.max(0, Math.min(index, count - 1));
    setPosition(0, true);
    if (status) status.textContent = "第 " + (activeIndex + 1) + " 张，共 " + count + " 张";
  }

  function pointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    currentX = startX;
    carousel.setPointerCapture(event.pointerId);
    setPosition(0, false);
  }

  function pointerMove(event) {
    if (!dragging) return;
    currentX = event.clientX;
    var width = carousel.clientWidth || 1;
    var offset = (currentX - startX) / width * 100;
    if ((activeIndex === 0 && offset > 0) || (activeIndex === count - 1 && offset < 0)) {
      offset *= .25;
    }
    setPosition(offset, false);
  }

  function pointerUp(event) {
    if (!dragging) return;
    dragging = false;
    if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId);

    var distance = currentX - startX;
    var threshold = Math.min(70, carousel.clientWidth * .15);
    if (distance < -threshold) show(activeIndex + 1);
    else if (distance > threshold) show(activeIndex - 1);
    else show(activeIndex);
  }

  carousel.addEventListener("pointerdown", pointerDown);
  carousel.addEventListener("pointermove", pointerMove);
  carousel.addEventListener("pointerup", pointerUp);
  carousel.addEventListener("pointercancel", pointerUp);
  carousel.addEventListener("lostpointercapture", function () {
    if (dragging) {
      dragging = false;
      show(activeIndex);
    }
  });

  show(0);
}());
