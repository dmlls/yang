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
  BANG_SYMBOL: "#symbol#",
  SEARCH_ENGINE: "#engine#",
});

const Defaults = Object.freeze({
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
  const settings = {};
  let defaultBangs = [];
  const bangApis = [
    "https://raw.githubusercontent.com/kagisearch/bangs/main/data/bangs.json",
    "https://duckduckgo.com/bang.js",
  ];
  let index = -1;
  for (const api of bangApis) {
    try {
      index++;
      const res = await fetch(new Request(api));
      defaultBangs = await res.json();
      break;
    } catch (error) {
      // retry
    }
  }
  for (const bang of defaultBangs) {
    // Neither Kagi nor DDG does not specify the origin for its own bangs,
    // so we add it.
    if (bang.u.startsWith("/")) {
      bang.u = index === 0 ? `https://kagi.com${bang.u}` : `https://duckduckgo.com${bang.u}`;
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
  // Exceptions for default bangs (unfortunately, they do not expose this info).
  const exceptions = [
    "archived",
    "archiveweb",
    "ia",
    "wayback",
    "waybackmachine",
    "wbm",
    "webarchive",
  ];
  for (const exc of exceptions) {
    const exc_bang = settings[getBangKey(exc)];
    if (exc_bang && exc_bang.length > 0) {
      exc_bang[0].urlEncodeQuery = false;
    }
  }
  // Fetch custom bangs.
  await browser.storage.sync.get().then(
    function onGot(storedSettings) {
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
  return null;
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
