---
layout: page
title: Blog
---

## Blog / Notes

This page collects my research notes, language-learning reflections, mathematical and scientific miscellany, informal essays, and other miscellaneous writing.

---

## Research Notes

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
