const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const xml2js = require('xml2js');
const mkdirp = require('mkdirp');
const { join, dirname } = require('path');
const rimraf = require('rimraf');
const ncp = require('ncp').ncp;

const host = process.env.HOST || 'http://localhost:3000';
const output = 'dist';

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

(async () => {
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
  .map(async ({ loc }) => {
    const path = join(loc[0].split(`${host}`)[1], 'index.html');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(loc[0]);
    const html = await page.content();
    await browser.close();
    return { path, html };
  });

  const files = await Promise.all(filePromises);

  /**
   * Create folder structure of static site
   */
  for (let { path, html } of files) {
    await writeFile(join(output, path), html);
  }
})();
