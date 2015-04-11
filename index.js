'use strict';

const http = require('http');
const fs = require('fs');

const siteName = 'My Perfect Site'
const blogPageName = '/blog';

const pages = fs.readdirSync(__dirname + '/pages');
const articles = fs.readdirSync(__dirname + '/articles');

const pageContent = pages.reduce(function(result, page) {
  result['/'+page] = fs.readFileSync(__dirname + '/pages/' + page);
  return result;
}, {});

const articleContent = articles.reduce(function(result, article) {
  result[article] = fs.readFileSync(__dirname + '/articles/' + article);
  return result;
}, {});

function head() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteName}</title>
      <style>${fs.readFileSync(__dirname + '/style.css')}</style>
    </head>
    <body>
  `;
}

function end() {
  return `</body>`;
}

function header() {
  return `
    <div>${siteName}</div>
    <ul>${pages.map(function(page) { return '<li><a href="' + page + '">' + page + '</a></li>'}).join('\n')}</ul>
  `;
}

function body(page) {
  return `
    <div>${pageContent[page]}</div>
  `;
}

function footer() {
  return `
    <div>This is the footer</div>
  `;
}

function listArticles() {
  return `
    <div>List of articles</div>
  `;
}

function notFound() {
  return `Not found`;
}

http.createServer(function(req, res) {
  res.write(head() + '\n');
  res.write(header() + '\n');
  res.write((req.url === blogPageName ? listArticles() : (pageContent[req.url] ? body(req.url) : notFound())) + '\n')
  res.write(footer() + '\n');
  res.write(end() + '\n');
  res.end('hello world: ' + req.url);
}).listen(3000);
