/* Copyright (C) 2023 Diego Miguel Lozano <hello@diegomiguel.me>
 *
 * This program is free software: you can redistribute it and//or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * For license information on the libraries used, see LICENSE.
 */

// Support for Chrome
if (typeof browser === "undefined") {
  var browser = chrome;
}

let bangs = {};
// Fetch Bangs from DuckDuckGo and load custom Bangs.
(async () => {
  const res = await fetch("https://duckduckgo.com/bang.js");
  const ddgBangs = await res.json();
  for (const bang of ddgBangs) {
    bangs[bang.t] = {
      url: bang.u,
      urlEncodeQuery: false, // default to false since we don't have this info
    };
  }
  await browser.storage.sync.get().then(
    function onGot(customBangs) {
      for (const [, bang] of Object.entries(customBangs)) {
        bangs[bang.bang] = {
          url: bang.url,
          urlEncodeQuery: bang.urlEncodeQuery,
        };
      }
    },
    function onError(error) {
      // TODO: Handle errors.
    },
  );
})();

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);
    // Skip requests for suggestions.
    const skip = ["/ac", "suggest", "/complete", "/autocompleter"].some(
      (path) => url.pathname.includes(path),
    );
    if (skip) {
      return null;
    }
    // Different search engines use different params for the query.
    const params = ["q", "p", "query", "text", "eingabe"]
      .reduce((acc, param) => {
        let q = url.searchParams.get(param);
        // Some search engines include the query in the request body.
        if (!q) {
          const form = details?.requestBody?.formData;
          if (form != null && Object.prototype.hasOwnProperty.call(form, param))
            q = details?.requestBody?.formData[param][0];
        }
        if (q != null) {
          acc.push(q);
        }
        return acc;
      }, [])
      .filter((a) => a);

    if (params[0] === undefined) {
      return null;
    }
    let bang = "";
    let query = "";
    const searchTerms = params[0].split(" ");
    if (searchTerms) {
      if (searchTerms[0].startsWith("!")) {
        bang = searchTerms[0].substring(1);
        query = searchTerms.slice(1).join(" ");
      } else if (searchTerms[searchTerms.length - 1].startsWith("!")) {
        bang = searchTerms[searchTerms.length - 1].substring(1);
        query = searchTerms.slice(0, -1).join(" ");
      } else {
        return null;
      }
    }
    if (bang.length > 0 && Object.prototype.hasOwnProperty.call(bangs, bang)) {
      const bangUrl = bangs[bang].url;
      let targetUrl = new URL(bangUrl.replace("{{{s}}}", query));
      // When using URL() the url will be encoded.
      if (!bangs[bang].urlEncodeQuery) {
        targetUrl = decodeURIComponent(targetUrl);
      }
      updateTab(details.tabId, targetUrl.toString());
    }
    return null;
  },
  {
    urls: ["<all_urls>"],
  },
  ["requestBody"],
);

function updateTab(tabId, url) {
  const updateProperties = { url };
  if (tabId != null) {
    browser.tabs.update(tabId, updateProperties);
  } else {
    browser.tabs.update(updateProperties);
  }
}

browser.action.onClicked.addListener(() => {
  browser.tabs.create({
    url: browser.runtime.getURL("options/options.html"),
  });
});

// Update custom bangs.
function updateCustomBangs(changes) {
  const modifiedBangs = Object.keys(changes);
  for (const bang of modifiedBangs) {
    bangs[bang] = changes[bang].newValue;
  }
}
browser.storage.sync.onChanged.addListener(updateCustomBangs);
