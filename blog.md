---
layout: page
title: Blog
---

## Blog / Notes

<ul class="blog-category-list">
  <li><a href="#research-notes">Research Notes</a></li>
  <li><a href="#language-learning">Language Learning</a></li>
  <li><a href="#mathematical-and-scientific-miscellany">Mathematical and Scientific Miscellany</a></li>
  <li><a href="#informal-essays">Informal Essays</a></li>
  <li><a href="#miscellaneous-stuff">Miscellaneous Stuff</a></li>
  <li><a href="#travelogue">Travelogue</a></li>
</ul>

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
  <li><a href="/reading-list/">📌 Reading List (live)</a></li>

  {% assign posts = site.categories.misc %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>

## Travelogue
{: #travelogue }

<ul>
  {% assign posts = site.categories.travelogue %}
  {% if posts.size > 0 %}
    {% for post in posts %}
      <li><a href="{{ post.url }}">{{ post.title }}</a> <small>— {{ post.date | date: "%B %d, %Y" }}</small></li>
    {% endfor %}
  {% else %}
    <li><em>No posts yet.</em></li>
  {% endif %}
</ul>
