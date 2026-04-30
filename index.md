---
layout: home
title: Home
---


This site serves as a record of my projects, blogs, and evolving research interests.

---

## Explore

- [About Me](/about/)
- [Projects](/projects/)
- [Blog](/blog/)
- [Experience](/experience/)
- [Contact](/contact/)

---

## Photo Gallery

<div class="home-slideshow">
  <figure class="gallery-slide active">
    <img src="/assets/images/gallery/2d925f3c013875f4cb8f5154dfa0a6ae.jpg" alt="Sunset at Labrador Park">
    <figcaption>Wonderful Sunset at Labrador Park</figcaption>
  </figure>
  <figure class="gallery-slide">
    <img src="/assets/images/gallery/a6f365f5c5b3c196373376bae43fe10f.jpg" alt="Cat at NTU">
    <figcaption>Little cat I encountered after auditing a physics class at NTU</figcaption>
  </figure>
</div>

<script>
(function () {
  const slides = document.querySelectorAll('.gallery-slide');
  if (!slides.length) return;

  let index = 0;
  setInterval(function () {
    slides[index].classList.remove('active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('active');
  }, 4500);
})();
</script>
