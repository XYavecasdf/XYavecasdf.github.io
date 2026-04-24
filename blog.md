---
layout: page
title: Blog
---

## Blog / Notes

<div class="blog-category-list">
  <a href="#research-notes">Research Notes</a>
  <a href="#language-learning">Language Learning</a>
  <a href="#mathematical-and-scientific-miscellany">Mathematical and Scientific Miscellany</a>
  <a href="#informal-essays">Informal Essays</a>
  <a href="#miscellaneous-stuff">Miscellaneous Stuff</a>
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
