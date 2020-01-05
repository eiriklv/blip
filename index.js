/**
 * Dependencies
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const util = require('util');
const marked = require('marked');
const favicon = require('serve-favicon');
const express = require('express');
const { Sitemap } = require('sitemap');
const { homepage } = require('./package.json');

/**
 * Config
 */
const buildMode = process.argv[3] === 'build';
const prefix = buildMode ? homepage : '';
const port = process.env.PORT || process.argv[2] || 3000;
const host = process.env.HOST || `http://localhost:${port}`;

/**
 * Blog settings
 */
const siteName = 'My Perfect Site'

/**
 * NOTE: Must be taken into consideration
 * when generating the sitemap
 */
const blogPageName = 'blog';

/**
 * Cache blog content to memory
 */
const pages = getContent('pages');
const posts = getContent('posts');

/**
 * Create express app
 */
const app = express();

/**
 * Generate and serve sitemap
 */
app.get('/sitemap.xml', function (req, res) {
  res.header('Content-Type', 'application/xml');

  const pageEntries = Object.keys(pages)
  .map((pageKey) => ({ url: `/${pageKey}` }));

  const postEntries = Object.keys(posts)
  .map((postKey) => ({ url: `/posts/${postKey}` }));

  const sitemap = new Sitemap({
    urls: [
      { url: '/' },
      ...pageEntries,
      { url: `/${blogPageName}` },
      ...postEntries,
    ],
    hostname: host,
  });

  res.send(sitemap.toString());
});

/**
 * Add route handlers
 */
app.use(express.static('static'));
app.use(favicon(`${__dirname}/static/favicon.ico`));
app.use(render);

/**
 * Start server
 */
app.listen(port, () => console.log(`Listening to port ${port}`));

/**
 * Blog rendering engine
 */
function render(req, res) {
  let route = req.url === '/' ?
  path.parse('/home') :
  path.parse(req.url);

  let isBlog = route.base === blogPageName;
  let post = posts[route.name];
  let page = pages[route.base];
  let isFound = !!(post || page);
  let notFound = pages['not-found'];
  let { title } = post || page || notFound;

  let markup = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${siteName + ' | ' + title}</title>
      <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Merriweather:100,300,400,700,900,100italic,300italic,400italic,700italic,900italic">
      <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext">
      <link rel="stylesheet" href="//cdn.jsdelivr.net/highlight.js/8.5/styles/default.min.css">
      <link rel="stylesheet" type="text/css" href="${prefix}/style.css?bust">
    </head>
    <body>
      <div class="container">

        <!-- Header -->

        <header>
          <h1><a href="${homepage}/">${siteName}</a></h1>
          <nav>
            <ul>
              ${Object.keys(pages).map((page) => {
                return !pages[page].noMenu ? `<li><a href="${prefix}/` + page + '">' + pages[page].title + '</a></li>' : '';
              }).join('\n')}
            </ul>
          </nav>
        </header>

        <!-- Main section -->

        <main>
          ${!isFound ? renderPage(notFound) : ''}
          ${page ? renderPage(page) : ''}
          ${post ? renderPost(post) : ''}
          ${isBlog ? listPosts(posts) : ''}
        </main>

        <!-- Footer -->

        <footer class="cf">
          <div class="left"><a href="${prefix}">© ${(new Date()).getFullYear() + ' ' + siteName}</a></div>
          <div class="right">Powered by <a href="https://github.com/eiriklv/blip">Blip</a>.</div>
        </footer>

        <!-- Scripts -->

        <script src="//cdn.jsdelivr.net/highlight.js/8.5/highlight.min.js"></script>
        <script>hljs.initHighlightingOnLoad();</script>

      </div>
    </body>
  `;

  res
  .status(isFound ? 200 : 404)
  .end(markup);
}

/**
 * Helper function to get blog
 * content from markdown files
 */
function getContent(dir) {
  return fs.readdirSync(`${__dirname}/${dir}`).reduce((result, entry) => {
    const raw = fs.readFileSync(`${__dirname}/${dir}/${entry}`, 'utf-8').toString();
    const regex = /(?:\r?\n){2}/g;
    const meta = raw.split(regex)[0];
    const content = raw.split(regex).slice(1).join('\n\n');

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

/**
 * Function for rendering a page
 */
function renderPage({ content = 'No content' }) {
  return `
    <section>${content}</section>
  `;
}

/**
 * Function for rendering a post
 */
function renderPost({
  title = 'No title',
  author = 'No author',
  date = 'No date',
  content = 'No content'
}) {
  return `
    <h1 class="title">${title}</h1>
    <summary>
      <span>Author: ${author}</span>
      <span> | </span>
      <span>Posted: ${date}</span>
    </summary>
    <article>${content}</article>
  `;
}

/**
 * Function for listing available posts
 */
function listPosts(posts) {
  return `
    <section>
      <ul>
        ${Object.keys(posts).map((post) => {
          return `<li><a href="${prefix}/${url.resolve('posts/', post)}">${posts[post].title}</a></li>`
        }).join('\n')}
      </ul>
    </section>
  `;
}
