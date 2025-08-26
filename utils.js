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

export { PreferencePrefix, Defaults, fetchSettings, getBangKey, getBangName };

// Prefixes added to the storage keys to differentiate between different types
// of settings.
const PreferencePrefix = Object.freeze({
  BANG: "#bang#",
  BANG_PROVIDER: "#provider#",
  BANG_SYMBOL: "#symbol#",
  SEARCH_ENGINE: "#engine#",
});

const BangProviders = Object.freeze({
  KAGI: {
    id: "kagi",
    url: "https://kagi.com",
    endpoints: [
      "https://raw.githubusercontent.com/kagisearch/bangs/main/data/bangs.json",
      "https://raw.githubusercontent.com/kagisearch/bangs/main/data/kagi_bangs.json",
      "https://raw.githubusercontent.com/kagisearch/bangs/main/data/assistant_bangs.json",
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
  BANG_PROVIDER: BangProviders.KAGI,
  BANG_SYMBOL: "!",
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
      const settings = {};
      // Fetch default bangs.
      let defaultBangs = [];
      const provider =
        BangProviders[settings[PreferencePrefix.BANG_PROVIDER].toUpperCase()];
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
        const bangTargets = [
          {
            url: bang.u,
            baseUrl:
              Object.hasOwn(bang, "fmt") && !bang.fmt.includes("open_base_path")
                ? null
                : new URL(bang.u).origin,
            urlEncodeQuery: Object.hasOwn(bang, "fmt")
              ? bang.fmt.includes("url_encode_placeholder")
              : true,
          },
        ];
        settings[getBangKey(bang.t)] = bangTargets;
        // Add Kagi aliases.
        if (bang.ts && bang.ts.length > 0) {
          for (const alias of bang.ts) {
            settings[getBangKey(alias)] = bangTargets;
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
        "m": settings[getBangKey("gm")],
        "map": settings[getBangKey("gm")],
        "maps": settings[getBangKey("gm")],
      }
      for (const [bang, target] of Object.entries(targetExceptions)) {
        settings[getBangKey(bang)] = target;
      }
      // Retrieve custom settings.
      for (const [key, item] of Object.entries(storedSettings)) {
        // In the session storage, for the bangs we only need the targets.
        settings[key] = key.startsWith(PreferencePrefix.BANG)
          ? item.targets
          : item;
      }
      if (
        !Object.hasOwn(settings, PreferencePrefix.BANG_SYMBOL) ||
        !settings[PreferencePrefix.BANG_SYMBOL]
      ) {
        settings[PreferencePrefix.BANG_SYMBOL] = Defaults.BANG_SYMBOL;
      }
      if (
        !Object.hasOwn(settings, PreferencePrefix.BANG_PROVIDER) ||
        !settings[PreferencePrefix.BANG_PROVIDER]
      ) {
        settings[PreferencePrefix.BANG_PROVIDER] = Defaults.BANG_PROVIDER.id;
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

function getBangKey(bang) {
  if (bang == null) {
    return null;
  }
  return `${PreferencePrefix.BANG}${bang.toLowerCase()}`;
}

function getBangName(bangKey) {
  if (bangKey == null) {
    return null;
  }
  return bangKey.slice(PreferencePrefix.BANG.length);
}
