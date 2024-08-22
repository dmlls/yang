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

let storedSettings = new Map();
storedSettings.set(PreferencePrefix.BANG_SYMBOL, {
  element: document.getElementById("bang-symbol"),
  default: "!",
});

function success() {
  window.location.replace("options.html");
}

async function saveSettings() {
  const settings = {};
  for (const [settingName, settingValue] of storedSettings) {
    settings[settingName] = settingValue.element.value || settingValue.default;
  }
  browser.storage.sync.set(settings).then(success, onError);
}

function onError() {}

function saveOnCtrlEnter(e) {
  if ((e.ctrlKey || e.metaKey) && (e.keyCode === 13 || e.keyCode === 10)) {
    saveSettings();
  } else if (e.keyCode === 13 || e.keyCode === 10) {
    e.preventDefault();
  }
}

browser.storage.sync.get(Array.from(storedSettings.keys())).then(
  function onGot(items) {
    for (const [settingName, settingValue] of storedSettings) {
      if (items.hasOwnProperty(settingName)) {
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
const saveButton = document.getElementById("save");
saveButton.addEventListener("click", saveSettings, false);

// Save with Ctrl+Enter or Cmd+Enter.
const inputFields = document.getElementsByClassName("input-field");
for (const field of inputFields) {
  field.onkeydown = saveOnCtrlEnter;
}
