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
  parseBangs,
  addSnapToUrl as addSnapToQuery,
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

let lastTriggerTime = new Date(0);

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const url = new URL(details.url);
    // Only consider certain requests.
    const include = [
      "/search",
      "duckduckgo.com/?",
      "duckduckgo.com/lite",
      "duckduckgo.com/html",
      "/dsearch", // Startpage add-on
      "/web?", // swisscows & ask.com
      "qwant.com/",
      "perplexity_ask", // Perplexity AI
      "/s", // Baidu
      "/meta", // metaGer
      "/serp", // dogpile
      "/search.seznam.cz",
    ].some((value) => url.href.includes(value));
    if (!include) {
      return null;
    }
    // Skip requests for suggestions and requests not related to search.
    const skip = [
      "/ac",
      "suggest",
      "/autosuggest",
      "/complete",
      "/autocompleter",
      "/autocomplete",
      "/sugrec",
      "/map",
      "/maps",
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
      "/static-assets", // DuckDuckGo
      "/_next", // DuckDuckGo
      "/dist", // DuckDuckGo
      "/spice", // DuckDuckGo
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
    ].some((path) => url.pathname.includes(path));
    if (
      skip ||
      url.searchParams.get("mod") === "1" || // Baidu
      url.searchParams.get("suggest") != null ||
      url.searchParams.get("tbm") === "map" // Google Maps
    ) {
      return null;
    }
    const currentTime = new Date();
    // Ensure we only trigger the bang once.
    if (currentTime - lastTriggerTime < 500) {
      return null;
    }
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
    lastTriggerTime = new Date();
    browser.storage.session
      .get([
        PreferencePrefix.BANG_SYMBOL,
        PreferencePrefix.SNAP_SYMBOL,
        PreferencePrefix.MULTI_BANG,
      ])
      .then(
        function onGot(item) {
          const bangSymbol =
            item[PreferencePrefix.BANG_SYMBOL] ?? Defaults.BANG_SYMBOL;
          const snapSymbol =
            item[PreferencePrefix.SNAP_SYMBOL] ?? Defaults.SNAP_SYMBOL;
          const multiBang =
            item[PreferencePrefix.MULTI_BANG] ?? Defaults.MULTI_BANG;
          let { bangs, snap, query } = parseBangs(
            searchQuery,
            bangSymbol,
            snapSymbol,
            multiBang,
          );
          if (bangs?.length > 0 || snap != null) {
            const bangKeys = bangs.map((b) => getBangKey(b));
            if (snap != null) {
              bangKeys.push(getBangKey(snap));
            }
            browser.storage.session.get(bangKeys).then(
              function onGot(items) {
                // Filter to only found bangs and snap.
                const foundBangs = bangs.filter((b) =>
                  Object.hasOwn(items, getBangKey(b)),
                );
                const snapData = Object.hasOwn(items, getBangKey(snap))
                  ? items[getBangKey(snap)]
                  : null;
                if (foundBangs.length === 0 && snapData === null) {
                  return;
                }
                browser.storage.session
                  .get(PreferencePrefix.INACTIVE_BANGS)
                  .then(
                    function onGot(inactiveBangs) {
                      let snapUrl = null;
                      if (
                        snapData != null &&
                        !(
                          snapData.default &&
                          inactiveBangs[
                            PreferencePrefix.INACTIVE_BANGS
                          ].includes(snap)
                        )
                      ) {
                        // For bangs that have multiple target URLs defined,
                        // we only consider the first one.
                        snapUrl = new URL(snapData.targets[0].url).host;
                        query = addSnapToQuery(query, snapUrl);
                      }
                      // Only snap, without bangs -> Issue a search with the snap.
                      if (foundBangs.length === 0 && snapUrl != null) {
                        browser.search.query({
                          tabId: details.tabId,
                          text: query,
                        });
                      } else {
                        let isFirstTarget = true;
                        for (const bangName of foundBangs) {
                          const bangKey = getBangKey(bangName);
                          const bangData = items[bangKey];
                          if (
                            bangData.default &&
                            inactiveBangs[
                              PreferencePrefix.INACTIVE_BANGS
                            ].includes(bangName)
                          ) {
                            continue;
                          }
                          const bangTargets = bangData.targets;
                          let targetUrl = null;
                          bangTargets.forEach((target) => {
                            if (query.length === 0 && target.baseUrl != null) {
                              targetUrl = target.baseUrl;
                            } else {
                              let encodedQuery = query;
                              if (target.urlEncodeQuery) {
                                encodedQuery = encodeURIComponent(query);
                              }
                              targetUrl = new URL(
                                target.url.replace("{{{s}}}", encodedQuery),
                              ).toString();
                            }
                            // Open first target URL in current tab...
                            if (isFirstTarget) {
                              updateTab(details.tabId, targetUrl);
                              isFirstTarget = false;
                            } else {
                              // ...and the rest in new tabs.
                              browser.tabs.create({
                                url: targetUrl,
                                active: false,
                              });
                            }
                          });
                        }
                      }
                    },
                    function onError(error) {
                      // TODO: Handle error.
                    },
                  );
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
        // v2.0.0
        if (bang.order != null) {
          delete bang.order;
        }
        return [bangKey, bang];
      }),
    );
    if (!Object.hasOwn(processedBangs, PreferencePrefix.BANG_SYMBOL)) {
      processedBangs[PreferencePrefix.BANG_SYMBOL] = Defaults.BANG_SYMBOL;
    }
    if (!Object.hasOwn(processedBangs, PreferencePrefix.SNAP_SYMBOL)) {
      processedBangs[PreferencePrefix.SNAP_SYMBOL] = Defaults.SNAP_SYMBOL;
    }
    if (!Object.hasOwn(processedBangs, PreferencePrefix.MULTI_BANG)) {
      processedBangs[PreferencePrefix.MULTI_BANG] = Defaults.MULTI_BANG;
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
