/* Copyright (C) 2023-2024 Diego Miguel Lozano <hello@diegomiguel.me>
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

import {
  PreferencePrefix,
  Defaults,
  fetchSettings,
  getBangKey,
} from "./utils.js";

// Support for Chrome.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

(async () => {
  fetchSettings(false);
})();

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const url = new URL(details.url);
    // Skip requests for suggestions.
    const skip =
      [
        "/ac",
        "suggest",
        "/complete",
        "/autocompleter",
        "/autocomplete",
        "/sugrec",
      ].some((path) => url.pathname.includes(path)) ||
      url.searchParams.get("mod") === "1"; // hack for Baidu
    if (skip) {
      return null;
    }
    // Different search engines use different params for the query.
    const params = ["q", "p", "query", "text", "eingabe", "wd"]
      .reduce((acc, param) => {
        let q = url.searchParams.get(param);
        // Some search engines include the query in the request body.
        if (!q) {
          const form = details?.requestBody?.formData;
          if (form != null && Object.hasOwn(form, param))
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
    browser.storage.session.get(PreferencePrefix.BANG_SYMBOL).then(
      function onGot(item) {
        const bangSymbol =
          item[PreferencePrefix.BANG_SYMBOL] || Defaults.BANG_SYMBOL;
        let bang = null;
        let query = null;
        const searchTerms = params[0].split(" ");
        if (searchTerms) {
          const firstTerm = searchTerms[0].trim();
          const lastTerm = searchTerms[searchTerms.length - 1].trim();
          if (firstTerm.startsWith(bangSymbol)) {
            bang = firstTerm.substring(bangSymbol.length);
            query = searchTerms.slice(1).join(" ");
          } else if (lastTerm.startsWith(bangSymbol)) {
            bang = lastTerm.substring(bangSymbol.length);
            query = searchTerms.slice(0, -1).join(" ");
          }
        }
        if (bang) {
          const bangKey = getBangKey(bang);
          browser.storage.session.get(bangKey).then(
            function onGot(item) {
              // Any matches?
              if (Object.hasOwn(item, bangKey)) {
                const bangInfo = item[bangKey];
                let targetUrl;
                if (query.length === 0 && bangInfo.openBaseUrl) {
                  targetUrl = new URL(bangInfo.url).origin;
                } else {
                  if (bangInfo.urlEncodeQuery) {
                    query = encodeURIComponent(query);
                  }
                  targetUrl = new URL(bangInfo.url.replace("{{{s}}}", query));
                }
                updateTab(details.tabId, targetUrl.toString());
              }
            },
            function onError(error) {
              // TODO: Handle error.
            },
          );
        }
      },
      function onError(error) {
        // TODO: Handle error.
      },
    );
    return null;
  },
  {
    urls: ["<all_urls>"],
  },
  ["blocking", "requestBody"],
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

// Temporal function to migrate storage schema.
async function updateStorageSchema() {
  const customBangs = await browser.storage.sync.get();
  if (Object.keys(customBangs).length > 0) {
    const sortedBangs = Object.fromEntries(
      Object.entries(customBangs)
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([bangKey, bang], index) => {
          if (
            !bangKey.startsWith(PreferencePrefix.BANG) &&
            !bangKey.startsWith(PreferencePrefix.BANG_SYMBOL) &&
            !bangKey.startsWith(PreferencePrefix.SEARCH_ENGINE)
          ) {
            bangKey = getBangKey(bang.bang);
          }
          if (
            !bangKey.startsWith(PreferencePrefix.BANG_SYMBOL) &&
            !bangKey.startsWith(PreferencePrefix.SEARCH_ENGINE)
          ) {
            bang.order = index;
          }
          return [bangKey, bang];
        }),
    );
    if (!Object.hasOwn(customBangs, PreferencePrefix.BANG_SYMBOL)) {
      customBangs[PreferencePrefix.BANG_SYMBOL] = "!";
    }
    await browser.storage.sync.clear().then(
      async function onCleared() {
        await browser.storage.sync.set(sortedBangs).then(
          function onSet() {
            fetchSettings(true);
          },
          async function onError(error) {
            await browser.storage.sync.set(sortedBangs); // Retry
          },
        );
      },
      function onError(error) {
        // TODO: Handle errors.
      },
    );
  }
}

browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  // if (temporary) return; // skip during development
  switch (reason) {
    case "update":
      updateStorageSchema();
      break;
    default:
      break;
  }
});
