'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const util = require('util');
const marked = require('marked');
const favicon = require('serve-favicon');
const express = require('express');
const app = express();

const siteName = 'My Perfect Site'
const blogPageName = 'blog';
const pages = getContent('/pages');
const articles = getContent('/articles');

app.use(express.static('static'));

app.use(favicon(__dirname + '/favicon.ico'));

app.use(function(req, res) {
  let route = req.url === '/' ?
    path.parse('/home') :
    path.parse(req.url);

  let page = pages[route.base];
  let article = articles[route.name];
  let title = (page && page.title) || (article && article.title);
  let isBlog = route.base === blogPageName;

  res.write(renderHead(title) + '\n');
  res.write(renderHeader(title) + '\n');

  if (!page && !article) {
    res.write(renderPage(pages['not-found']) + '\n');
  } else {
    if (page) res.write(renderPage(page));
    if (isBlog) res.write(listArticles());
    if (article) res.write(renderArticle(article));
  }

  res.write(renderFooter() + '\n');
  res.write(renderEnd() + '\n');
  res.end();
});

app.listen(3000);

function getContent(dir) {
  return fs.readdirSync(__dirname + dir).reduce(function(result, entry) {
    let raw = fs.readFileSync(__dirname + dir + '/' + entry, 'utf-8').toString();
    let regex = /(?:\r?\n){2}/g;
    let meta = raw.split(regex)[0];
    let content = raw.split(regex).slice(1).join('\n\n');

    result[path.basename(entry, '.txt')] = {
      title: meta.match(/^TITLE:(.*)$/m) && meta.match(/^TITLE:(.*)$/m)[1],
      author: meta.match(/^AUTHOR:(.*)$/m) && meta.match(/^AUTHOR:(.*)$/m)[1],
      date: meta.match(/^DATE:(.*)$/m) && meta.match(/^DATE:(.*)$/m)[1],
      noMenu: meta.match(/^(NOMENU:1)$/m) ? true : false,
      url: meta.match(/^URL:(.*)$/m) && meta.match(/^URL:(.*)$/m)[1],
      content: marked(content)
    };

    return result;
  }, {});
}

function renderHead(title) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteName + ' ' + title}</title>
      <link rel="stylesheet" type="text/css" href="/style.css">
    </head>
    <body>
  `;
}

function renderEnd() {
  return `</body>`;
}

function renderHeader(title) {
  return `
    <header>
      <h1><a href="/">${siteName}</a></h1>
      <ul>${
        Object.keys(pages).map(function(page) {
          return !pages[page].noMenu ? '<li><a href="/' + page + '">' + pages[page].title + '</a></li>' : null;
        }).join('\n')
      }</ul>
    </header>
  `;
}

function renderPage(page) {
  return `
    <main>${page.content}</main>
  `;
}

function renderArticle(article) {
  return `
    <article>${article.content}</article>
  `;
}

function renderFooter() {
  return `
    <footer>
      <div class="left"><a href="">© ${(new Date()).getFullYear() + ' ' + siteName}</a></div>
      <div class="right">Powered by <a href="http://blip.me">Blip</a>.</div>
    </footer>
  `;
}

function listArticles() {
  return `
    <section>
      <ul>${
        Object.keys(articles).map(function(article) {
          return '<li><a href="' + url.resolve('/articles/', article) + '">' + articles[article].title + '</a></li>'
        }).join('\n')
      }</ul>
    </section>
  `;
}
