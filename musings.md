---
layout: page
title: 碎碎念
permalink: /musings/
---

<style>
  .musing-gate {
    max-width: 520px;
    margin-top: 1.4rem;
    padding: 1.2rem 1.35rem;
    border: 1px solid #d9e5fb;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 24px rgba(29, 78, 216, 0.07);
  }

  .musing-gate label {
    display: block;
    font-weight: 700;
    margin-bottom: 0.35rem;
  }

  .musing-gate input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    font: inherit;
  }

  .musing-gate button,
  .musings-lock-button {
    margin-top: 0.75rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid #1d4ed8;
    border-radius: 999px;
    background: #1d4ed8;
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .musing-gate button:hover,
  .musings-lock-button:hover {
    background: #1e3a8a;
  }

  .musing-gate-note {
    margin-top: 0.75rem;
    color: #64748b;
    font-size: 0.88rem;
  }

  .musing-error {
    color: #b91c1c;
    font-size: 0.9rem;
    margin-top: 0.55rem;
  }

  #musings-private {
    display: none;
  }

  .musings-private-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
  }

  .musings-lock-button {
    margin-top: 0;
    background: #64748b;
    border-color: #64748b;
    font-size: 0.85rem;
  }

  .musings-lock-button:hover {
    background: #475569;
  }
</style>

## 碎碎念

A small place for casual notes, scattered thoughts, and fragments that are too informal to become full blog posts.

<div id="musing-gate" class="musing-gate">
  <label for="musing-password">Password</label>
  <input id="musing-password" type="password" autocomplete="current-password" placeholder="Enter password">
  <button id="musing-unlock" type="button">Enter</button>
  <div id="musing-error" class="musing-error" hidden>Incorrect password.</div>
  <p class="musing-gate-note">This is a semi-private front-end gate, not real encryption. It is meant to keep casual visitors out, not to protect sensitive information.</p>
</div>

<div id="musings-private">
  <div class="musings-private-header">
    <strong>Private / semi-private notes</strong>
    <button id="musings-lock" class="musings-lock-button" type="button">Lock again</button>
  </div>

  <div class="note-wall">
    <article class="note-card">
      <div class="note-card-date">2026-09-02</div>
      <p>今天再次打开 YouTube 上好久前收藏的中古汉语课程，感受到对于学习汉语族语言（方言）甚至日语、韩语、越南语，中古汉语之于它们的地位好似 Vulgar Latin 之于罗曼语族语言 :}</p>
      <p>有趣。</p>
    </article>
  </div>
</div>

<script>
(function () {
  const expectedHash = "a4d052346087b4082b8fd13602abfd29272c7a922c46a9c745a63502d75d6eac";
  const storageKey = "musings_unlocked_v1";

  const gate = document.getElementById("musing-gate");
  const privateContent = document.getElementById("musings-private");
  const input = document.getElementById("musing-password");
  const unlockButton = document.getElementById("musing-unlock");
  const lockButton = document.getElementById("musings-lock");
  const error = document.getElementById("musing-error");

  if (!gate || !privateContent || !input || !unlockButton) return;

  function showPrivateContent() {
    gate.style.display = "none";
    privateContent.style.display = "block";
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function checkPassword() {
    const value = input.value || "";
    const hash = await sha256(value);
    if (hash === expectedHash) {
      localStorage.setItem(storageKey, "true");
      showPrivateContent();
    } else {
      error.hidden = false;
      input.value = "";
      input.focus();
    }
  }

  if (localStorage.getItem(storageKey) === "true") {
    showPrivateContent();
  }

  unlockButton.addEventListener("click", checkPassword);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") checkPassword();
  });

  if (lockButton) {
    lockButton.addEventListener("click", function () {
      localStorage.removeItem(storageKey);
      privateContent.style.display = "none";
      gate.style.display = "block";
      input.value = "";
      input.focus();
    });
  }
})();
</script>
