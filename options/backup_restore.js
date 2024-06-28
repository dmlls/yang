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

import { PreferencePrefix, getBangKey } from "../utils.js";

const BACKUP_VERSION = "1.0";

const BackupFields = Object.freeze({
  BACKUP_VERSION: "backupVersion",
  BANGS: "bangs",
  SEARCH_ENGINES: "searchEngines",
});

function exportSettings(settings) {
  const jsonString = JSON.stringify(settings, null, 2);
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "");
  const filename = `yang-backup_${timestamp}.json`;

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function importSettings(file) {
  const reader = new FileReader();

  reader.onload = async (event) => {
    const preferences = new Map();
    try {
      const neededFields = ["name", "url", "bang", "urlEncodeQuery"];
      let readBangs = JSON.parse(event.target.result);
      // New backup schema.
      const backupKeys = Object.keys(readBangs);
      if (
        Object.values(BackupFields).every((val) => backupKeys.includes(val))
      ) {
        readBangs = readBangs.bangs;
      }
      // Old backup schema.
      let order = 0;
      for (const [bangName, bangInfo] of Object.entries(readBangs)) {
        if (!neededFields.every((key) => Object.keys(bangInfo).includes(key))) {
          throw new SyntaxError("Malformed backup file.");
        }
        bangInfo.bang = bangInfo.bang.toLowerCase();
        bangInfo.order = order;
        if (!Object.hasOwn("openBaseUrl")) {
          bangInfo.openBaseUrl = false;
        }
        let key;
        // New storage schema.
        if (bangName.startsWith(PreferencePrefix.BANG)) {
          key = bangInfo.bang;
        } else if (!bangName.startsWith(PreferencePrefix.SEARCH_ENGINE)) {
          // Old storage schema.
          key = getBangKey(bangInfo.bang);
        }
        preferences.set(key, bangInfo);
        order++;
      }
      await browser.storage.sync.set(Object.fromEntries(preferences));
      alert("Settings imported successfully!");
      window.location.href = "options.html";
    } catch (error) {
      console.error("Error importing settings:", error);
      alert(
        "Error importing settings. Please make sure the file is a valid Yang backup.",
      );
    }
  };
  reader.readAsText(file);
}

const exportButton = document.getElementById("export");
exportButton.addEventListener("click", async () => {
  const settings = await browser.storage.sync.get().then(
    function onGot(customBangs) {
      const sortedBangs = Object.entries(customBangs)
        .sort((a, b) => a[1].order - b[1].order)
        .map((entry) => entry[1]);
      const loadedSettings = {};
      loadedSettings[BackupFields.BACKUP_VERSION] = BACKUP_VERSION;
      loadedSettings[BackupFields.BANGS] = {};
      loadedSettings[BackupFields.SEARCH_ENGINES] = {};
      for (const [, bang] of Object.entries(sortedBangs)) {
        loadedSettings[BackupFields.BANGS][bang.bang.toLowerCase()] = {
          name: bang.name,
          url: bang.url,
          bang: bang.bang.toLowerCase(),
          urlEncodeQuery: bang.urlEncodeQuery,
          openBaseUrl: bang?.openBaseUrl ?? false,
        };
      }
      return loadedSettings;
    },
    function onError(error) {
      // TODO: Handle errors.
    },
  );
  exportSettings(settings);
});

const importButton = document.getElementById("import");
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
