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

export {
  PreferencePrefix,
  BangProviders,
  Defaults,
  fetchSettings,
  getPage,
  getBangKey,
  getBangName,
  parseBangs,
  searchBangs,
  sortBangs,
  addSnapToUrl,
  removeWhitespaces,
};

// Prefixes added to the storage keys to differentiate between different types
// of settings.
const PreferencePrefix = Object.freeze({
  BANG: "#bang#",
  BANG_PROVIDER: "#provider#",
  BANG_SYMBOL: "#symbol#",
  SNAP_SYMBOL: "#snap#",
  INACTIVE_BANGS: "#inactive#",
  MULTI_BANG: "#multi_bang#",
});

const BangProviders = Object.freeze({
  KAGI: {
    id: "kagi",
    url: "https://kagi.com",
    endpoints: [
      "https://raw.githubusercontent.com/kagisearch/bangs/main/data/bangs.json",
      "https://raw.githubusercontent.com/kagisearch/bangs/main/data/kagi_bangs.json",
    ],
  },
  DDG: {
    id: "ddg",
    url: "https://duckduckgo.com",
    endpoints: ["https://duckduckgo.com/bang.js"],
  },
  NONE: {
    id: "none",
    url: "",
    endpoints: [],
  },
});

const Defaults = Object.freeze({
  BANG_PROVIDER: BangProviders.KAGI.id,
  BANG_SYMBOL: "!",
  SNAP_SYMBOL: null,
  ITEMS_PER_PAGE: 25,
  INACTIVE_BANGS: [],
  MULTI_BANG: false,
});

async function fetchSettings(update = false) {
  if (!update) {
    // Check if any settings are loaded. We look for, e.g., the bang symbol key.
    // If no settings are loaded, we fetch them and retry. A more elegant
    // solution would be `StorageArea.getBytesInUse()`, but it's not supported
    // for `storage.session`.
    const updated = await browser.storage.session
      .get(PreferencePrefix.BANG_SYMBOL)
      .then(
        function onGot(item) {
          // Any matches?
          return Object.hasOwn(item, PreferencePrefix.BANG_SYMBOL);
        },
        function onError(error) {
          // TODO: Handle error.
        },
      );
    if (updated) {
      return null;
    }
  }
  // Fetch settings and store them in the session storage.
  const result = await browser.storage.sync.get().then(
    async function onGot(storedSettings) {
      let settings = {};
      // Fetch default bangs.
      let defaultBangs = [];
      settings[PreferencePrefix.BANG_PROVIDER] =
        storedSettings[PreferencePrefix.BANG_PROVIDER] ??
        Defaults.BANG_PROVIDER;
      const provider =
        BangProviders[settings[PreferencePrefix.BANG_PROVIDER].toUpperCase()];
      if (provider.id !== BangProviders.NONE.id) {
        for (const api of provider.endpoints) {
          try {
            const res = await fetch(new Request(api));
            defaultBangs = defaultBangs.concat(await res.json());
          } catch (error) {
            return error;
          }
        }
        for (const bang of defaultBangs) {
          // Bang providers do not specify the origin for bangs targeting their own
          // site, so we add it.
          if (bang.u.startsWith("/")) {
            bang.u = `${provider.url}${bang.u}`;
          }
          const bangData = {
            bang: bang.t,
            name: bang.s.trim(),
            targets: [
              {
                url: bang.u.trim(),
                baseUrl:
                  Object.hasOwn(bang, "fmt") &&
                  !bang.fmt.includes("open_base_path")
                    ? null
                    : new URL(bang.u).origin,
                urlEncodeQuery: Object.hasOwn(bang, "fmt")
                  ? bang.fmt.includes("url_encode_placeholder")
                  : true,
              },
            ],
            default: true,
          };
          settings[getBangKey(bang.t)] = bangData;
          // Add Kagi aliases.
          if (bang.ts && bang.ts.length > 0) {
            for (const alias of bang.ts) {
              settings[getBangKey(alias)] = { ...bangData, bang: alias };
            }
          }
        }
        // Exceptions for URL encoding of default bangs (unfortunately, they do
        // not expose this info).
        const urlEncodingExceptions = [
          "archived",
          "archiveweb",
          "ia",
          "wayback",
          "waybackmachine",
          "wbm",
          "webarchive",
        ];
        for (const exc of urlEncodingExceptions) {
          const exc_bang = settings[getBangKey(exc)];
          if (exc_bang && exc_bang.length > 0) {
            exc_bang[0].urlEncodeQuery = false;
          }
        }
        // Exceptions to point default bangs to different targets.
        const targetExceptions = {
          m: settings[getBangKey("gm")],
          map: settings[getBangKey("gm")],
          maps: settings[getBangKey("gm")],
        };
        for (const [bang, data] of Object.entries(targetExceptions)) {
          settings[getBangKey(bang)] = data;
        }
      }
      // Update with custom settings (IMPORTANT: This must be done after loading
      // the default bangs, otherwise those would override the custom bangs and
      // not vice versa).
      settings = { ...settings, ...storedSettings };
      if (
        !Object.hasOwn(settings, PreferencePrefix.BANG_SYMBOL) ||
        !settings[PreferencePrefix.BANG_SYMBOL]
      ) {
        settings[PreferencePrefix.BANG_SYMBOL] = Defaults.BANG_SYMBOL;
      }
      if (
        !Object.hasOwn(settings, PreferencePrefix.INACTIVE_BANGS) ||
        !settings[PreferencePrefix.INACTIVE_BANGS]
      ) {
        settings[PreferencePrefix.INACTIVE_BANGS] = [];
      }
      if (!Object.hasOwn(settings, PreferencePrefix.MULTI_BANG)) {
        settings[PreferencePrefix.MULTI_BANG] = Defaults.MULTI_BANG;
      }
      browser.storage.session.clear().then(
        function onCleared() {
          browser.storage.session.set(settings);
        },
        function onError(error) {},
      );
    },
    function onError(error) {
      // TODO: Handle error.
    },
  );
  return result;
}

// Pagination utility.
function getPage(items, pageNumber, itemsPerPage = Defaults.ITEMS_PER_PAGE) {
  if (items.length === 0) {
    return {
      totalPages: 1,
      page: [],
    };
  }
  // Total number of pages.
  const totalPages = Math.ceil(items.length / itemsPerPage);
  if (pageNumber > totalPages) {
    pageNumber = totalPages;
  }
  const pages = Array.from({ length: totalPages }, (_, i) => {
    const start = i * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  });
  return {
    totalPages,
    page: pages[pageNumber - 1],
  };
}

function sortBangs(bangs) {
  return bangs.sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);
    // If equal names, sort by bang.
    if (comparison === 0) {
      return a.bang.localeCompare(b.bang);
    }
    return comparison;
  });
}

function getSearchScore(target, query) {
  const processedTarget = target.toLowerCase();
  const processedQuery = query.toLowerCase();
  if (processedTarget === processedQuery) {
    return 2;
  } else if (processedTarget.startsWith(query)) {
    return 1;
  }
  return 0;
}

function searchBangs(bangs, query) {
  const processedQuery = query.toLowerCase();
  return bangs
    .filter(
      (bang) =>
        bang.name.toLowerCase().includes(processedQuery) ||
        bang.bang.toLowerCase().includes(processedQuery),
    )
    .sort((a, b) => {
      return (
        getSearchScore(b.name, processedQuery) +
        getSearchScore(b.bang, processedQuery) -
        (getSearchScore(a.name, processedQuery) +
          getSearchScore(a.bang, processedQuery))
      );
    });
}

function getBangKey(bang) {
  if (bang == null) {
    return null;
  }
  return `${PreferencePrefix.BANG}${bang.trim().toLowerCase()}`;
}

function getBangName(bangKey) {
  if (bangKey == null) {
    return null;
  }
  return bangKey.trim().slice(PreferencePrefix.BANG.length);
}

function removeWhitespaces(text) {
  return text?.replace(/\s+/g, "");
}

// Whitespace tokenization.
function tokenizeQuery(searchQuery) {
  // Remove extra whitespaces to ensure the next split works correctly.
  return searchQuery
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((i) => i);
}

// Used to check for potential bangs / snaps.
function matchesSymbol(tk, symbol) {
  if (symbol != null) {
    return tk.startsWith(symbol) && tk.length > symbol.length;
  }
  return false;
}

function parseBangs(searchQuery, bangSymbol, snapSymbol, multiBang) {
  if (searchQuery.startsWith(" ") || searchQuery.endsWith(" ")) {
    return {
      bangs: [],
      snap: null,
      query: searchQuery,
    };
  }
  const queryTokens = tokenizeQuery(searchQuery);
  if (queryTokens.length === 0) {
    return {
      bangs: [],
      snap: null,
      query: null,
    };
  }
  let bangs = [];
  let snap = null;
  let done = false;
  let fromIndex = 0;
  let untilIndex = queryTokens.length;
  const bangsAtBeginning =
    matchesSymbol(queryTokens[0], bangSymbol) ||
    matchesSymbol(queryTokens[0], snapSymbol);
  for (const [i, tk] of queryTokens.entries()) {
    if (
      !bangsAtBeginning &&
      bangs.length === 0 &&
      snap === null &&
      !matchesSymbol(tk, bangSymbol) &&
      !matchesSymbol(tk, snapSymbol)
    ) {
      continue;
    } else if (!bangsAtBeginning && untilIndex === queryTokens.length) {
      untilIndex = i;
    }
    if (matchesSymbol(tk, bangSymbol)) {
      if (!multiBang && bangs.length > 0) {
        done = true;
      } else {
        bangs.push(tk);
      }
    } else if (matchesSymbol(tk, snapSymbol)) {
      if (snap != null) {
        done = true;
      } else {
        snap = tk;
      }
    } else if (!bangsAtBeginning && (bangs.length > 0 || snap != null)) {
      // "Sandwiched" bangs/snap (e.g., "nothing .s .g something") -> Reset bangs and snap.
      bangs = [];
      snap = null;
      fromIndex = 0;
      untilIndex = queryTokens.length;
    } else {
      done = true;
    }
    fromIndex = i;
    if (done) {
      break;
    } else if (i === queryTokens.length - 1) {
      fromIndex += bangs.length + (snap != null);
    }
  }
  return {
    bangs: [...bangs.map((b) => b.trim().substring(bangSymbol.length))],
    snap: snap != null ? snap.trim().substring(snapSymbol.length) : snap,
    query: bangsAtBeginning
      ? queryTokens.slice(fromIndex).join(" ")
      : queryTokens.slice(0, untilIndex).join(" "),
  };
}

function addSnapToUrl(query, snapUrl) {
  if (snapUrl != null) {
    return `${query ?? ""} site:${snapUrl}`.trim();
  }
  return query ?? "";
}
