---
layout: page
title: Blog
---

## Blog / Notes

This page collects my research notes, language-learning reflections, mathematical and scientific miscellany, informal essays, and other miscellaneous writing.

<div class="category-grid">
  <a class="category-card" href="#research-notes">
    <strong>Research Notes</strong>
    <span>Research summaries, PyTorch, CUDA, Math4AI, and technical notes.</span>
  </a>
  <a class="category-card" href="#language-learning">
    <strong>Language Learning</strong>
    <span>Notes on Spanish, Japanese, Cantonese, pronunciation, and linguistics.</span>
  </a>
  <a class="category-card" href="#mathematical-and-scientific-miscellany">
    <strong>Mathematical and Scientific Miscellany</strong>
    <span>Mathematics, physics, computation, and scientific curiosities.</span>
  </a>
  <a class="category-card" href="#informal-essays">
    <strong>Informal Essays</strong>
    <span>Short reflections, ideas, and less formal writing.</span>
  </a>
  <a class="category-card" href="#miscellaneous-stuff">
    <strong>Miscellaneous Stuff</strong>
    <span>Everything that does not fit neatly elsewhere.</span>
  </a>
</div>

---

## Research Notes
{: #research-notes }

<ul>
  {% assign posts = site.categories.research %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>

## Language Learning
{: #language-learning }

<ul>
  {% assign posts = site.categories.language %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>

## Mathematical and Scientific Miscellany
{: #mathematical-and-scientific-miscellany }

<ul>
  {% assign posts = site.categories.math-science %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>

## Informal Essays
{: #informal-essays }

<ul>
  {% assign posts = site.categories.essay %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>

## Miscellaneous Stuff
{: #miscellaneous-stuff }

<ul>
  {% assign posts = site.categories.misc %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>
