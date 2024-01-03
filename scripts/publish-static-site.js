const fs = require("fs");
const axios = require("axios");
const puppeteer = require("puppeteer");
const xml2js = require("xml2js");
const mkdirp = require("mkdirp");
const { join, dirname } = require("path");
const rimraf = require("rimraf");
const { ncp } = require("ncp");
const ghpages = require("gh-pages");
const { spawn } = require("child_process");
const { blip } = require("../package.json");

/**
 * Specify which host the server will be running on
 * NOTE: We're just choosing a port that most likely is not in use
 */
const serverHost = "http://localhost:3997";
const publishHost = blip.host;
const publishPath = blip.homepage;

/**
 * Specify the output directory for the generated static files
 */
const output = "dist";

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
    ghpages.publish(path, function (err) {
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
  const server = spawn("node", ["index.js", "3997", "build"]);
  server.stdout.pipe(process.stdout);
  server.stderr.pipe(process.stdout);

  /**
   * Wait to ensure server is ready to accept incoming requests
   */
  await wait(2000);

  /**
   * Delete existing files
   */
  rimraf.sync(output);

  /**
   * Copy static files
   */
  await copy("static", output);

  /**
   * Fetch sitemap
   */
  const sitemap = await axios
    .get(`${serverHost}/sitemap.xml`)
    .then(({ data }) => data);

  /**
   * Convert sitemap to JSON
   */
  const sitemapAsJSON = await new Promise((resolve, reject) => {
    xml2js.parseString(sitemap, function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });

  /**
   * Generate sitemap for the published url
   */
  const generatedSitemap = await axios
    .get(`${serverHost}/sitemap.xml?host=${publishHost}&subpath=${publishPath}`)
    .then(({ data }) => data);

  const { urlset: { url = [] } = {} } = sitemapAsJSON;

  /**
   * Get the HTML for each of the pages
   */
  const filePromises = url.map(async ({ loc }, i) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(loc[0]);
    await page.waitFor(100);
    const html = await page.content();
    await browser.close();
    const path = join(loc[0].split(`${serverHost}`)[1], "index.html");
    return { path, html };
  });

  /**
   * Get the HTML for the 404 page
   */
  const notFoundFilePromise = (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(serverHost + "/404.html");
    await page.waitFor(100);
    const html = await page.content();
    await browser.close();
    const path = "404.html";
    return { path, html };
  })();

  /**
   * Perform the actual fetching and processing
   */
  const files = await Promise.all([...filePromises, notFoundFilePromise]);

  /**
   * Create folder structure of static site
   */
  for (let { path, html } of files) {
    await writeFile(join(output, path), html);
  }

  /**
   * Copy sitemap.xml
   */
  try {
    await writeFile(join(output, "sitemap.xml"), generatedSitemap);
  } catch (error) {
    console.log(error);
  }

  /**
   * Publish to github pages
   */
  try {
    await publish(output);
  } catch (error) {
    console.log(error);
  }

  /**
   * Remove dist folder
   */
  //rimraf.sync(output);

  /**
   * Stop local server
   */
  server.kill("SIGINT");

  /**
   * Report to user that everything was okay
   */
  console.log(`Published site to ${blip.homepage}`);
})();
