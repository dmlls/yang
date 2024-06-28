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

import { PreferencePrefix, getBangKey } from "./utils.js";

const bangs = {};
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
    function onGot(preferences) {
      Object.entries(preferences).forEach(([prefKey, pref]) => {
        if (!prefKey.startsWith(PreferencePrefix.SEARCH_ENGINE)) {
          bangs[pref.bang] = {
            url: pref.url,
            urlEncodeQuery: pref.urlEncodeQuery,
            openBaseUrl: pref?.openBaseUrl ?? false,
          };
        }
      });
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
      const firstTerm = searchTerms[0].trim();
      const lastTerm = searchTerms[searchTerms.length - 1].trim();
      if (firstTerm.startsWith("!")) {
        bang = firstTerm.substring(1);
        query = searchTerms.slice(1).join(" ");
      } else if (lastTerm.startsWith("!")) {
        bang = lastTerm.substring(1);
        query = searchTerms.slice(0, -1).join(" ");
      } else {
        return null;
      }
    }
    bang = bang.toLowerCase();
    if (Object.hasOwn(bangs, bang)) {
      const bangUrl = bangs[bang].url;
      let targetUrl = "";
      if (query.length === 0 && bangs[bang].openBaseUrl) {
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
  const updateProperties = { url };
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
  for (const changedKey of Object.keys(changes)) {
    if (!changedKey.startsWith(PreferencePrefix.SEARCH_ENGINE)) {
      const changedValue = changes[changedKey];
      if (Object.hasOwn(changedValue, "newValue")) {
        bangs[changedValue.newValue.bang] = changedValue.newValue;
      } else if (Object.hasOwn(changedValue, "oldValue")) {
        // removed bang
        delete bangs[changedValue.oldValue.bang];
      }
    }
  }
}
browser.storage.sync.onChanged.addListener(updateCustomBangs);

// Temporal function to migrate storage schema.
async function updateStorageSchema() {
  const customBangs = {};
  await browser.storage.sync.get().then(
    function onGot(preferences) {
      for (const [prefKey, pref] of Object.entries(preferences)) {
        if (
          !prefKey.startsWith(PreferencePrefix.BANG) &&
          !prefKey.startsWith(PreferencePrefix.SEARCH_ENGINE)
        ) {
          customBangs[getBangKey(pref.bang)] = pref;
        }
      }
    },
    function onError(error) {
      // TODO: Handle errors.
    },
  );
  if (Object.keys(customBangs).length > 0) {
    await browser.storage.sync.clear().then(
      async function onCleared() {
        await browser.storage.sync.set(customBangs).then(
          function onSet() {
            // Success
          },
          async function onError(error) {
            await browser.storage.sync.set(customBangs); // Retry
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
