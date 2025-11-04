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

// Support for Chromium.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

(async () => {
  await fetchSettings(false);
})();

browser.runtime.onStartup.addListener(async () => {
  await fetchSettings(false);
});

let lastTriggerTime = new Date();

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const url = new URL(details.url);
    // Only consider certain requests.
    const include = [
      "/search",
      "duckduckgo.com/?",
      "/dsearch", // Startpage add-on
      "/web?", // swisscows & ask.com
      "qwant.com/",
      "perplexity_ask", // Perplexity AI
      "https://www.qwant.com/?q=",
      "/s", // Baidu
      "/meta", // metaGer
      "/serp", // dogpile
      "/search.seznam.cz",
      "leta.mullvad.net/",
    ].some((value) => url.href.includes(value));
    if (!include) {
      return null;
    }
    // Skip requests for suggestions and requests not related to search.
    const skip =
      [
        "/ac",
        "suggest",
        "/autosuggest",
        "/complete",
        "/autocompleter",
        "/autocomplete",
        "/sugrec",
        "/favicon",
        ".js",
        ".css",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        ".woff2",
        "/ia",
        "/asset", // Kagi
        "/socket", // Kagi
        "/static-assets", // DuckDuckGo
        "/_next", // DuckDuckGo
        "/dist", // DuckDuckGo
        "/xjs", // Google
        "/async", // Google
        "/searchbox", // Google
        "/speech-api", // Google
        "/httpservice", // Google
        "/cdn", // StartPage
        "/dplpxs", // StartPage
        "/sxpra", // StartPage
        "/afs", // StartPage
        "/jst", // StartPage
        "/atq", // StartPage
        "/ep1", // StartPage
        "/sa", // Bing
        "/sbi", // Bing
        "/auth", // Bing
        "/exploremore", // Bing
        "/svctrlpack", // Bing
        "/sugg", // Yahoo!
        "/beacon", // Yahoo!
        "/static", // Ecosia
        "/events", // Qwant
      ].some((path) => url.pathname.includes(path)) ||
      url.searchParams.get("mod") === "1"; // hack for Baidu
    if (skip) {
      return null;
    }
    const currentTime = new Date();
    // Ensure we only trigger the bang once.
    if (currentTime - lastTriggerTime < 500) {
      lastTriggerTime = currentTime;
      return null;
    }
    lastTriggerTime = currentTime;
    // Different search engines use different params for the query.
    const params = ["q", "p", "query", "query_str", "text", "eingabe", "wd"];
    let searchQuery = null;
    for (const param of params) {
      searchQuery = url.searchParams.get(param);
      // Some search engines include the query in the request body.
      if (!searchQuery) {
        const form = details?.requestBody?.formData;
        if (form != null && Object.hasOwn(form, param)) {
          searchQuery = form[param][0];
        } else if (details?.requestBody?.raw) {
          const decodedBody = JSON.parse(
            decodeURIComponent(
              String.fromCharCode.apply(
                null,
                new Uint8Array(details.requestBody.raw[0].bytes),
              ),
            ),
          );
          if (Object.hasOwn(decodedBody, param)) {
            searchQuery = decodedBody[param];
          }
        }
      }
      if (searchQuery != null) {
        break;
      }
    }
    if (!searchQuery) {
      return null;
    }
    browser.storage.session.get(PreferencePrefix.BANG_SYMBOL).then(
      function onGot(item) {
        const bangSymbol =
          item[PreferencePrefix.BANG_SYMBOL] ?? Defaults.BANG_SYMBOL;
        let bang = null;
        let query = null;
        const searchTerms = searchQuery.split(" ");
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
                browser.storage.session
                  .get(PreferencePrefix.INACTIVE_BANGS)
                  .then(
                    function onGot(inactiveBangs) {
                      if (
                        !(
                          item[bangKey].default &&
                          inactiveBangs[
                            PreferencePrefix.INACTIVE_BANGS
                          ].includes(bang)
                        )
                      ) {
                        const bangTargets = item[bangKey].targets;
                        let targetUrl;
                        bangTargets.forEach((target, index) => {
                          if (query.length === 0 && target.baseUrl != null) {
                            targetUrl = target.baseUrl;
                          } else {
                            if (target.urlEncodeQuery) {
                              query = encodeURIComponent(query);
                            }
                            targetUrl = new URL(
                              target.url.replace("{{{s}}}", query),
                            ).toString();
                          }
                          // Open first target URL in current tab...
                          if (index === 0) {
                            updateTab(details.tabId, targetUrl);
                          } else {
                            // ...and the rest in new tabs.
                            browser.tabs.create({
                              url: targetUrl,
                              active: false,
                            });
                          }
                        });
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
    url: browser.runtime.getURL("options/options.html?page=1"),
  });
});

// Temporal function to migrate storage schema.
async function updateStorageSchema() {
  const customBangs = await browser.storage.sync.get();
  if (Object.keys(customBangs).length > 0) {
    const processedBangs = Object.fromEntries(
      Object.entries(customBangs).map(([bangKey, bang]) => {
        if (
          !bangKey.startsWith(PreferencePrefix.BANG) &&
          !bangKey.startsWith(PreferencePrefix.BANG_SYMBOL) &&
          !bangKey.startsWith(PreferencePrefix.BANG_PROVIDER) &&
          !bangKey.startsWith(PreferencePrefix.SEARCH_ENGINE) &&
          !bangKey.startsWith(PreferencePrefix.INACTIVE_BANGS)
        ) {
          bangKey = getBangKey(bang.bang);
        }
        // v1.0.0
        if (bang.url != null && !Array.isArray(bang.url)) {
          bang.targets = [
            {
              url: bang.url,
              baseUrl: bang.openBaseUrl ? new URL(bang.url).origin : null,
              urlEncodeQuery: bang.urlEncodeQuery,
            },
          ];
          delete bang.url;
          delete bang.openBaseUrl;
          delete bang.urlEncodeQuery;
        }
        return [bangKey, bang];
      }),
    );
    if (!Object.hasOwn(processedBangs, PreferencePrefix.BANG_SYMBOL)) {
      processedBangs[PreferencePrefix.BANG_SYMBOL] = Defaults.BANG_SYMBOL;
    }
    if (!Object.hasOwn(processedBangs, PreferencePrefix.BANG_PROVIDER)) {
      processedBangs[PreferencePrefix.BANG_PROVIDER] = Defaults.BANG_PROVIDER;
    }
    if (!Object.hasOwn(processedBangs, PreferencePrefix.INACTIVE_BANGS)) {
      processedBangs[PreferencePrefix.INACTIVE_BANGS] = Defaults.INACTIVE_BANGS;
    }
    await browser.storage.sync.clear().then(
      async function onCleared() {
        await browser.storage.sync.set(processedBangs).then(
          async function onSet() {
            await fetchSettings(true);
          },
          async function onError(error) {
            await browser.storage.sync.set(processedBangs); // Retry
            await fetchSettings(true);
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
