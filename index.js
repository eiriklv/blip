'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const util = require('util');
const marked = require('marked');

const siteName = 'My Perfect Site'
const blogPageName = 'blog';

function getContent(dir) {
  return fs.readdirSync(__dirname + dir).reduce(function(result, entry) {
    // split into meta section and content section
    // create an object that contains
    // - title
    // - author
    // - post time
    // - etc..
    // (depends on if it is an article or page)
    result[path.basename(entry, '.txt')] = marked(fs.readFileSync(__dirname + dir + '/' + entry).toString());
    return result;
  }, {});
}

const pageContent = getContent('/pages');
const articleContent = getContent('/articles');

function head(page, article) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteName + ' ' + page + ' ' + article}</title>
      <style>${fs.readFileSync(__dirname + '/style.css')}</style>
    </head>
    <body>
  `;
}

function end() {
  return `</body>`;
}

function header(page, article) {
  return `
    <div>${siteName + ' ' + page + ' ' + article}</div>
    <ul>${Object.keys(pageContent).map(function(page) { return '<li><a href="/' + page + '">' + page + '</a></li>'}).join('\n')}</ul>
  `;
}

function renderPage(page) {
  return `
    <div>${pageContent[page]}</div>
  `;
}

function renderArticle(article) {
  return `
    <div>${articleContent[article]}</div>
  `;
}

function footer() {
  return `
    <div>This is the footer</div>
  `;
}

function listArticles() {
  return `
    <ul>${Object.keys(articleContent).map(function(article) { return '<li><a href="' + url.resolve('/articles/', article) + '">' + article + '</a></li>'}).join('\n')}</ul>
  `;
}

function notFound() {
  return `Not found`;
}

http.createServer(function(req, res) {
  let route = path.parse(req.url);
  let page = pageContent[route.base];
  let article = articleContent[route.name];
  let isBlog = route.base === blogPageName;
  let isHome = req.url === '/';

  res.write(head(route.dir, route.name) + '\n');
  res.write(header(route.dir, route.name) + '\n');

  if (!page && !article && !isHome) {
    res.write(notFound() + '\n');
  } else {
    if (page) res.write(renderPage(route.base));
    if (isHome) res.write(renderPage('home'));
    if (isBlog) res.write(listArticles());
    if (article) res.write(renderArticle(route.name));
  }

  res.write(footer() + '\n');
  res.write(end() + '\n');
  res.write('req.url: ' + req.url + '\n');
  res.write('route: ' + util.inspect(route));
  res.end();
}).listen(3000);
