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

let bangs = {};
// Fetch Bangs from DuckDuckGo and load custom Bangs.
(async () => {
  // Add DDG bangs.
  const res = await fetch(new Request("https://duckduckgo.com/bang.js"));
  const ddgBangs = await res.json();
  for (const bang of ddgBangs) {
    bangs[bang.t] = {
      url: bang.u,
      urlEncodeQuery: true, // default value
      openBaseUrl: true, // default value
    };
  }
  // Exceptions (unfortunately, DDG does not expose this info).
  bangs.wayback.urlEncodeQuery = false;
  bangs.waybackmachine.urlEncodeQuery = false;
  // Add custom bangs.
  await browser.storage.sync.get().then(
    function onGot(customBangs) {
      for (const [, bang] of Object.entries(customBangs)) {
        bangs[bang.bang.toLowerCase()] = {
          url: bang.url,
          urlEncodeQuery: bang.urlEncodeQuery,
          openBaseUrl: bang?.openBaseUrl ?? false,
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
    bang = bang.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(bangs, bang)) {
      const bangUrl = bangs[bang].url;
      let targetUrl = "";
      if (query.length == 0 && bangs[bang].openBaseUrl) {
        targetUrl = new URL(bangUrl).origin;
      } else {
        if (bangs[bang].urlEncodeQuery) {
          query = encodeURIComponent(query);
        }
        targetUrl = new URL(bangUrl.replace("{{{s}}}", query));
      }
      updateTab(details.tabId, targetUrl.toString());
    }
    return null;
  },
  {
    urls: ["<all_urls>"],
  },
  ["blocking", "requestBody"],
);

function updateTab(tabId, url) {
  const updateProperties = {
    url: url,
  };
  if (tabId != null) {
    browser.tabs.update(tabId, updateProperties);
  } else {
    browser.tabs.update(updateProperties);
  }
}

browser.browserAction.onClicked.addListener(function () {
  browser.tabs.create({
    url: browser.runtime.getURL("options/options.html"),
  });
});

// Update custom bangs.
function updateCustomBangs(changes) {
  const modifiedBangs = Object.keys(changes);
  for (const bang of modifiedBangs) {
    bangs[bang.toLowerCase()] = changes[bang].newValue;
  }
}
browser.storage.sync.onChanged.addListener(updateCustomBangs);
