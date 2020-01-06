const fs = require('fs');
const axios = require('axios');
const puppeteer = require('puppeteer');
const xml2js = require('xml2js');
const mkdirp = require('mkdirp');
const { join, dirname } = require('path');
const rimraf = require('rimraf');
const { ncp } = require('ncp');
const ghpages = require('gh-pages');
const { spawn } = require('child_process');

/**
 * Specify which host the server will be running on
 * NOTE: We're just choosing a port that most likely is not in use
 */
const host = 'http://localhost:3997';

/**
 * Specify the output directory for the generated static files
 */
const output = 'dist';

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function copy(src, dest) {
  return new Promise((resolve, reject) => {
    ncp(src, dest, function (err) {
     if (err) {
       reject(err);
     } else {
       resolve();
     }
    });
  });
}

function writeFile(path, contents) {
  return new Promise((resolve, reject) => {
    mkdirp(dirname(path), function (err) {
      if (err) {
        reject(err);
      } else {
        fs.writeFile(path, contents, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

function publish(path) {
  return new Promise((resolve, reject) => {
    ghpages.publish(path, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

(async () => {
  /**
   * Start local server
   */
  const server = spawn('node', ['index.js', '3997', 'build']);
  server.stdout.pipe(process.stdout)
  server.stderr.pipe(process.stdout);

  /**
   * Wait to ensure server is ready to accept incoming requests
   */
  await wait(1000);

  /**
   * Delete existing files
   */
  rimraf.sync(output);

  /**
   * Copy static files
   */
  await copy('static', output);

  /**
   * Fetch sitemap and convert to JSON
   */
  const sitemap = await axios
  .get(`${host}/sitemap.xml`)
  .then(({ data }) => new Promise((resolve, reject) => {
    xml2js.parseString(data, function (err, result) {
      if (err) {
        reject(err);
      } else{
        resolve(result);
      }
    });
  }));

  const {
    urlset: {
      url = []
    } = {},
  } = sitemap;

  /**
   * Get the HTML for each of the pages
   */
  const filePromises = url
  .map(async ({ loc }, i) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(loc[0]);
    await page.waitFor(100);
    await page.screenshot({ path: `example-${i}.png` });
    const html = await page.content();
    await browser.close();
    const path = join(loc[0].split(`${host}`)[1], 'index.html');
    return { path, html };
  });

  const files = await Promise.all(filePromises);

  /**
   * Create folder structure of static site
   */
  for (let { path, html } of files) {
    await writeFile(join(output, path), html);
  }

  /**
   * Publish to github pages
   */
  await publish(output);

  /**
   * Remove dist folder
   */
  rimraf.sync(output);

  /**
   * Stop local server
   */
  server.kill('SIGINT');
})();
