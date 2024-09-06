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

export { PreferencePrefix, Defaults, fetchSettings, getBangKey };

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
    // Check whether there are any settings are loaded. We look for, e.g.,
    // the bang symbol key. If no settings are loaded, we fetch them and retry
    // A more elegant solution would be `StorageArea.getBytesInUse()`, but
    // it's not supported for `storage.session`.
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
  for (const api of bangApis) {
    try {
      const res = await fetch(new Request(api));
      defaultBangs = await res.json();
      break;
    } catch (error) {
      // retry
    }
  }
  for (const bang of defaultBangs) {
    settings[getBangKey(bang.t)] = {
      url: bang.u,
      urlEncodeQuery: true, // default value
      openBaseUrl: true, // default value
    };
  }
  // Exceptions (unfortunately, default bangs do not expose this info).
  settings[getBangKey("wayback")].urlEncodeQuery = false;
  settings[getBangKey("waybackmachine")].urlEncodeQuery = false;
  // Fetch custom bangs.
  await browser.storage.sync.get().then(
    function onGot(storedSettings) {
      for (let [bangKey, bangInfo] of Object.entries(storedSettings)) {
        // In the session storage, we don't need all the bang values stored in
        // the sync storage. Here, we filter them out.
        if (bangKey.startsWith(PreferencePrefix.BANG)) {
          bangInfo = {
            url: bangInfo.url,
            urlEncodeQuery: bangInfo.urlEncodeQuery,
            openBaseUrl: bangInfo.openBaseUrl,
          };
        }
        settings[bangKey] = bangInfo;
      }
      if (!Object.hasOwn(settings, PreferencePrefix.BANG_SYMBOL)) {
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
