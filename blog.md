---
layout: page
title: Blog
---

## Blog / Notes

Here are my posts and notes:

<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
      <small> — {{ post.date | date: "%B %d, %Y" }}</small>
    </li>
  {% endfor %}
</ul>
