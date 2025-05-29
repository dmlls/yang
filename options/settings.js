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

import { PreferencePrefix } from "../utils.js";
import {
  BACKUP_VERSION,
  BackupFields,
  exportSettings,
  importSettings,
} from "./export_import.js";

const LIMITS = Object.freeze({
  // Maximum total amount (in bytes) of data that can be stored in sync storage.
  // Firefox: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync#storage_quotas_for_sync_data
  // Chrome: https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync-sync-QUOTA_BYTES
  SYNC_MAX_QUOTA_BYTES: 102400,
  // Maximum number of items that can be stored in sync storage.
  // Firefox: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync#storage_quotas_for_sync_data
  // Chrome: https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync-sync-MAX_ITEMS
  SYNC_MAX_ITEMS: 512,
});

// Support for Chromium.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

let storedSettings = new Map();
storedSettings.set(PreferencePrefix.BANG_SYMBOL, {
  element: document.getElementById("bang-symbol"),
  default: "!",
});

function success() {
  window.location.assign("options.html");
}

function saveSettings() {
  const settings = {};
  for (const [settingName, settingValue] of storedSettings) {
    settings[settingName] = settingValue.element.value || settingValue.default;
  }
  browser.storage.sync.set(settings).then(
    function onSet() {
      browser.storage.session.set(settings).then(success, onError);
    },
    function onError(error) {},
  );
}

function onError(error) {}

browser.storage.sync.get(Array.from(storedSettings.keys())).then(
  function onGot(items) {
    for (const [settingName, settingValue] of storedSettings) {
      if (Object.hasOwn(items, settingName) && items[settingName] != null) {
        settingValue.element.setAttribute("value", items[settingName]);
      } else {
        settingValue.element.setAttribute("value", settingValue.default);
      }
    }
  },
  function onError(error) {
    // TODO: Handle error.
  },
);
// Storage quotas only on Desktop, since on Mobile they don't work reliably.
if (!window.matchMedia("(hover: none)").matches) {
  (async () => {
    const bytesInUse = await browser.storage.sync.getBytesInUse();
    let storagePercentage = (bytesInUse / LIMITS.SYNC_MAX_QUOTA_BYTES) * 100;
    const storagePercentageLabel =
      storagePercentage > 0 && storagePercentage < 1
        ? "< 1"
        : Math.round(storagePercentage);
    document.getElementById("storage-quota-usage").textContent =
      `${(bytesInUse / 1000).toFixed(2)} KB of ` +
      `${(LIMITS.SYNC_MAX_QUOTA_BYTES / 1000).toFixed(2)} KB used ` +
      `(${storagePercentageLabel}%)`;
    document.getElementById("storage-quota-bar").style.width =
      `${storagePercentage}%`;
    browser.storage.sync.get().then(
      function onGot(storedData) {
        const bangCount = Object.keys(storedData).filter((k) => {
          return k.startsWith(PreferencePrefix.BANG);
        }).length;
        const otherSettingsCount = Object.keys(storedData).length - bangCount;
        const totalBangsLimit = LIMITS.SYNC_MAX_ITEMS - otherSettingsCount;
        const bangPercentage = (bangCount / totalBangsLimit) * 100;
        const bangPercentageLabel =
          bangPercentage !== 0 && bangPercentage < 1
            ? "< 1"
            : Math.round(bangPercentage);
        document.getElementById("storage-item-usage").textContent =
          `${bangCount} bangs of ${totalBangsLimit} bangs used ` +
          `(${bangPercentageLabel}%)`;
        document.getElementById("storage-item-bar").style.width =
          `${bangPercentage}%`;
      },
      function onError(error) {
        // TODO: Handle errors.
      },
    );
  })();
}
document.body.style.opacity = "1";
const saveButton = document.getElementById("save");
saveButton.addEventListener("click", saveSettings, false);

const keyHandler = (e) => {
  // Save on Ctrl/Cmd + Enter.
  if ((e.ctrlKey || e.metaKey) && (e.keyCode === 13 || e.keyCode === 10)) {
    saveSettings();
  } else if (e.keyCode === 13 || e.keyCode === 10) {
    e.preventDefault();
  }
  // Exit on Escape.
  else if (e.key === "Escape") {
    e.preventDefault();
    window.location.assign("options.html");
  }
};
document.body.addEventListener("keydown", keyHandler);

const exportButton = document.getElementById("export-button");
exportButton.addEventListener("click", async () => {
  const settings = await browser.storage.sync.get().then(
    function onGot(storedData) {
      const loadedSettings = {};
      loadedSettings[BackupFields.BACKUP_VERSION] = BACKUP_VERSION;
      loadedSettings[BackupFields.SETTINGS] = {};
      loadedSettings[BackupFields.SETTINGS][BackupFields.BANG_SYMBOL] =
        storedData[PreferencePrefix.BANG_SYMBOL] || "!";
      loadedSettings[BackupFields.SETTINGS][BackupFields.SEARCH_ENGINES] = {};
      const sortedBangs = Object.entries(storedData)
        .filter((entry) => entry[0].startsWith(PreferencePrefix.BANG))
        .sort((a, b) => a[1].order - b[1].order)
        .map((entry) => {
          delete entry[1].order;
          return entry[1];
        });
      loadedSettings[BackupFields.BANGS] = sortedBangs;
      return loadedSettings;
    },
    function onError(error) {
      // TODO: Handle errors.
    },
  );
  exportSettings(settings);
});

const importButton = document.getElementById("import-button");
const fileInput = document.getElementById("fileInput");
importButton.addEventListener("click", () => {
  fileInput.click();
});
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    importSettings(file);
  }
});
