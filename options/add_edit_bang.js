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

import { getBangKey } from "../utils.js";

// Support for Chromium.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

const FormFields = Object.freeze({
  NAME: "name",
  URL: "url",
  BANG: "bang",
  URL_ENCODE_QUERY: "urlEncodeQuery",
  OPEN_BASE_URL: "openBaseUrl",
});

function showErrorMessage(inputField, message) {
  const errorMsg = document.getElementById(`error-${inputField.id}`);
  errorMsg.textContent = message;
  errorMsg.style.visibility = "visible";
  inputField.classList.add("error-input-border");
}

function hideErrorMessage(inputField) {
  const errorMsg = document.getElementById(`error-${inputField.id}`);
  inputField.classList.remove("error-input-border");
  errorMsg.style.visibility = "hidden";
}

function validateEmptyOrTooLong(inputElement, maxLength) {
  const textValue = inputElement.value.trim();
  if (textValue == null || textValue === "") {
    showErrorMessage(inputElement, "This field cannot be empty.");
    return null;
  } else if (maxLength !== undefined && textValue.length > maxLength) {
    showErrorMessage(
      inputElement,
      `The input is too long (max. ${maxLength} characters allowed).`,
    );
    return null;
  } else {
    hideErrorMessage(inputElement);
    return textValue.trim();
  }
}

function validateUrl(inputElement) {
  let url;
  const urlString = inputElement.value.trim();
  try {
    url = decodeURIComponent(new URL(urlString));
  } catch (_) {
    showErrorMessage(
      inputElement,
      "Invalid URL (don't forget to include the scheme, e.g., 'https://').",
    );
    return null;
  }
  // Valid.
  hideErrorMessage(inputElement);
  return url;
}

async function validateBangKey(oldBangKey, newBangKey) {
  const bangElement = document.getElementById(FormFields.BANG);
  if (newBangKey == null) {
    return false;
  } else if (/\s/.test(newBangKey)) {
    showErrorMessage(bangElement, "The bang cannot contain whitespaces.");
    return false;
  } else if (oldBangKey === newBangKey) {
    return true;
  }
  const valid = await browser.storage.sync.get(newBangKey).then(
    function onGot(item) {
      if (Object.keys(item).length > 0) {
        showErrorMessage(bangElement, "This bang already exists.");
        return false;
      } else {
        hideErrorMessage(bangElement);
        return true;
      }
    },
    function onError(error) {
      // TODO: Handle error.
    },
  );
  return valid;
}

function getInputValue(inputId) {
  let value;
  const inputElement = document.getElementById(inputId);
  switch (inputElement.type) {
    case "text":
      switch (inputId) {
        case FormFields.NAME:
          value = validateEmptyOrTooLong(inputElement, 100);
          break;
        case FormFields.URL:
          value = validateEmptyOrTooLong(inputElement, 250);
          if (value !== null) {
            value = validateUrl(inputElement);
          }
          break;
        case FormFields.BANG:
          value = validateEmptyOrTooLong(inputElement, 25);
          if (value !== null) {
            // Remove leading or trailing "!".
            value = stripExclamation(value).trim().toLowerCase();
          }
          break;
        default:
          break;
      }
      break;
    case "checkbox":
      value = inputElement.checked;
      break;
    default:
      break;
  }
  return value;
}

function getInputtedBang(last, mode) {
  const newBang = {};
  const inputIds = Object.values(FormFields);
  const inputtedValues = inputIds.map((inputId) => getInputValue(inputId));
  for (let i = 0; i < inputIds.length; i++) {
    newBang[inputIds[i]] = inputtedValues[i];
  }
  newBang.order = mode === "add" ? last + 1 : last;
  return newBang;
}

function isInputtedBangValid(bang) {
  return !Object.values(bang).includes(null);
}

function stripExclamation(string) {
  return string.replace(/^!+|!+$/g, "");
}

function setItem() {
  window.location.href = "options.html";
}

function onError() {}

async function saveCustomBang() {
  const saveButton = document.getElementById("save");
  const inputtedBang = getInputtedBang(saveButton.last, saveButton.mode);
  const inputtedBangKey = getBangKey(inputtedBang.bang);
  // Note: The single "&" is deliberate.
  if (
    isInputtedBangValid(inputtedBang) &
    (await validateBangKey(saveButton.bangKey, inputtedBangKey))
  ) {
    if (saveButton.mode === "edit") {
      // If the bang has changed and does not already exist ->
      // Delete the previous one first.
      await browser.storage.sync.remove(saveButton.bangKey);
      await browser.storage.session.remove(saveButton.bangKey);
    }
    await browser.storage.sync.set({ [inputtedBangKey]: inputtedBang }).then(
      function onSet() {
        browser.storage.session
          .set({
            [inputtedBangKey]: {
              url: inputtedBang.url,
              urlEncodeQuery: inputtedBang.urlEncodeQuery,
              openBaseUrl: inputtedBang.openBaseUrl,
            },
          })
          .then(setItem, onError);
      },
      function onError(error) {},
    );
  }
}

function saveOnCtrlEnter(e) {
  if ((e.ctrlKey || e.metaKey) && (e.keyCode === 13 || e.keyCode === 10)) {
    saveCustomBang();
  }
}

const saveButton = document.getElementById("save");
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");
const last = Number(urlParams.get("last"));
let bangKey;
if (mode === "edit") {
  const title = document.getElementById("title");
  title.innerHTML = "Edit Custom Bang";
  document.title = "Yang! – Edit Bang";
  bangKey = getBangKey(stripExclamation(urlParams.get("bang")));
  browser.storage.sync.get(bangKey).then(
    function onGot(item) {
      const bang = item[bangKey];
      for (const field of Object.values(FormFields)) {
        const inputElement = document.getElementById(field);
        switch (inputElement.type) {
          case "text":
            inputElement.value = bang[field];
            break;
          case "checkbox":
            inputElement.checked = bang[field] ?? false;
            break;
          default:
            break;
        }
      }
      saveButton.last = bang.order;
    },
    function onError(error) {
      // TODO: Handle error.
    },
  );
} else {
  saveButton.last = last;
  document.getElementById("name").focus(); // focus first field
}
saveButton.mode = mode;
saveButton.bangKey = bangKey;
saveButton.addEventListener("click", saveCustomBang, false);
document.body.style.opacity = "1";

// Save with Ctrl+Enter or Cmd+Enter.
const inputFields = document.getElementsByClassName("input-field");
for (const field of inputFields) {
  field.onkeydown = saveOnCtrlEnter;
}
