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

import { Defaults, fetchSettings, PreferencePrefix } from "../utils.js";
import { exportSettings, importSettings } from "./export_import.js";

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
  default: Defaults.BANG_SYMBOL,
});
storedSettings.set(PreferencePrefix.BANG_PROVIDER, {
  element: document.getElementById("bang-provider"),
  default: Defaults.BANG_PROVIDER,
});
let initialBangProvider = null;

function saveSettings() {
  const settings = {};
  let fetchNeeded = false;
  for (const [settingName, settingValue] of storedSettings) {
    settings[settingName] = settingValue.element.value || settingValue.default;
    if (
      settingName === PreferencePrefix.BANG_PROVIDER &&
      initialBangProvider !== settings[settingName]
    ) {
      fetchNeeded = true;
    }
  }
  browser.storage.sync.set(settings).then(
    function onSet() {
      browser.storage.session.set(settings).then(async () => {
        if (fetchNeeded) {
          const saveButtonInner = document.querySelector(
            "#save > .button-inner",
          );
          saveButtonInner.style.visibility = "hidden";
          const saveButtonSpinner = document.querySelector(
            "#save > .button-spinner",
          );
          saveButtonSpinner.style.display = "flex";
          const result = await fetchSettings(true);
          if (result != null) {
            alert(
              "There was an error fetching the default bangs. Please, check " +
                "your internet connection and try again.",
            );
          }
        }
        window.location.assign("options.html?page=1");
      }, onError);
    },
    function onError(error) {},
  );
}

function onError(error) {}

browser.storage.sync.get(Array.from(storedSettings.keys())).then(
  function onGot(items) {
    for (const [settingName, settingValue] of storedSettings) {
      if (Object.hasOwn(items, settingName) && items[settingName] != null) {
        settingValue.element.value = items[settingName];
      } else {
        settingValue.element.value = settingValue.default;
      }
    }
    // Resize selects.
    [...document.getElementsByTagName("select")].forEach((select) => {
      // Initial resize
      resizeSelect(select);
      // Resize on change
      select.addEventListener("change", () => resizeSelect(select));
    });
    initialBangProvider = storedSettings.get(PreferencePrefix.BANG_PROVIDER)
      .element.value;
  },
  function onError(error) {
    // TODO: Handle error.
  },
);

// Storage quotas only on Desktop, since on Mobile they don't work reliably.
if (!window.matchMedia("(hover: none)").matches) {
  (async () => {
    const bytesInUse = await browser.storage.sync.getBytesInUse();
    const storagePercentage = (bytesInUse / LIMITS.SYNC_MAX_QUOTA_BYTES) * 100;
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
      function onError() {
        // TODO: Handle errors.
      },
    );
  })();
}
document.body.style.opacity = 1;
const saveButton = document.getElementById("save");
saveButton.addEventListener("click", saveSettings, false);

const keyHandler = (e) => {
  // Save on Ctrl/Cmd + Enter.
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    saveSettings();
  } else if (e.key === "Enter") {
    e.preventDefault();
  }
  // Exit on Escape.
  else if (e.key === "Escape") {
    e.preventDefault();
    window.location.assign("options.html?page=1");
  }
};
document.body.addEventListener("keydown", keyHandler);

const exportButton = document.getElementById("export-button");
exportButton.addEventListener("click", () => {
  exportSettings();
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

// Resize selects to the selected option.
function resizeSelect(selectElement) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const tmpSpan = document.createElement("span");
  tmpSpan.style.visibility = "hidden";
  tmpSpan.style.whiteSpace = "nowrap";
  tmpSpan.style.font = getComputedStyle(selectElement).font; // Match the font style
  tmpSpan.textContent = selectedOption.text; // Get the text of the selected option
  document.body.appendChild(tmpSpan);

  // Set the width of the select to the width of the selected option
  selectElement.style.width = `${tmpSpan.offsetWidth + 35}px`; // Add some padding
  document.body.removeChild(tmpSpan);
}
