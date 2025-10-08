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

export { BACKUP_VERSION, BackupFields, exportSettings, importSettings };
import {
  Defaults,
  PreferencePrefix,
  fetchSettings,
  getBangKey,
} from "../utils.js";

// Support for Chromium.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

const BACKUP_VERSION = "1.3";

const BackupFields = Object.freeze({
  BACKUP_VERSION: "backupVersion",
  BANGS: "bangs",
  SETTINGS: "settings",
  BANG_SYMBOL: "bangSymbol",
  BANG_PROVIDER: "bangProvider",
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

async function importSettings(file) {
  const errorMsg = "Error importing settings.";
  const reader = new FileReader();
  reader.onload = async (event) => {
    const preferences = new Map();
    try {
      const readBackup = JSON.parse(event.target.result);
      let readBangs = {};
      const backupKeys = Object.keys(readBackup);
      // Backup version < 1.0.
      let backupVersion = 1.0;
      if (!backupKeys.includes(BackupFields.BACKUP_VERSION)) {
        readBangs = readBackup;
      } else {
        readBangs = readBackup[BackupFields.BANGS];
        backupVersion = parseFloat(readBackup[BackupFields.BACKUP_VERSION]);
      }
      let bangSymbol = Defaults.BANG_SYMBOL;
      let bangProvider = Defaults.BANG_PROVIDER.id;
      // Backup version >= 1.1.
      if (backupKeys.includes(BackupFields.SETTINGS)) {
        const settings = readBackup[BackupFields.SETTINGS];
        bangSymbol = settings[BackupFields.BANG_SYMBOL] ?? Defaults.BANG_SYMBOL;
        // Backup version >= 1.3.
        bangProvider =
          settings[BackupFields.BANG_PROVIDER] ?? Defaults.BANG_PROVIDER.id;
      }
      const neededFields =
        backupVersion >= 1.2
          ? ["name", "bang", "targets"]
          : ["name", "url", "bang", "urlEncodeQuery"];
      for (const [bangName, bangInfo] of Object.entries(readBangs)) {
        if (!neededFields.every((key) => Object.keys(bangInfo).includes(key))) {
          throw new SyntaxError("Malformed backup file.");
        }
        bangInfo.bang = bangInfo.bang.toLowerCase();
        if (backupVersion < 1.2) {
          bangInfo.targets = [
            {
              url: bangInfo.url,
              baseUrl:
                Object.hasOwn("openBaseUrl") && bangInfo.openBaseUrl
                  ? new URL(bangInfo.url).origin
                  : null,
              urlEncodeQuery: bangInfo.urlEncodeQuery,
            },
          ];
          delete bangInfo.url;
          delete bangInfo.openBaseUrl;
          delete bangInfo.urlEncodeQuery;
        }
        let key;
        // Backup version >= 1.0.
        if (bangName.startsWith(PreferencePrefix.BANG)) {
          key = bangInfo.bang;
        } else {
          key = getBangKey(bangInfo.bang);
        }
        preferences.set(key, bangInfo);
      }
      preferences.set(PreferencePrefix.BANG_SYMBOL, bangSymbol);
      preferences.set(PreferencePrefix.BANG_PROVIDER, bangProvider);
      browser.storage.sync.set(Object.fromEntries(preferences)).then(
        async function onSet() {
          await fetchSettings(true);
          alert("Settings imported successfully!");
          window.location.assign("options.html?page=1");
        },
        function onError(error) {
          console.error(errorMsg, error.message);
          if (
            error.message.includes("QuotaExceededError") ||
            error.message.includes("QUOTA_BYTES")
          ) {
            alert(
              `${errorMsg} The backup file is too big and exceeds the ` +
                "browser's storage limits. Please, make it smaller and try again.",
            );
          } else {
            alert(`${errorMsg} ${error.message}`);
          }
        },
      );
    } catch (error) {
      console.error(errorMsg, error);
      alert(`${errorMsg} Please, make sure the file is a valid Yang backup.`);
    }
  };
  reader.readAsText(file);
}
