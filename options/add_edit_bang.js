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

import { getBangKey, getBangName } from "../utils.js";

// Support for Chromium.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

// Mapping from input to the class name of the input.
const FORM_FIELDS = Object.freeze({
  NAME: "name",
  BANG: "bang",
  URL: "url",
  BASE_URL: "base-url",
  URL_ENCODE_QUERY: "url-encode-query",
});

const LIMITS = Object.freeze({
  // Maximum length for the name of the bang.
  MAX_LENGTH_NAME: 100,
  // Maximum length for the the bang.
  MAX_LENGTH_BANG: 25,
  // Maximum length for the the URLs.
  MAX_LENGTH_URLS: 250,
  // Maximum number of target URLs users can input.
  MAX_NUMBER_URLS: 10,
});

function validateEmptyOrTooLong(inputElement, containerElement, maxLength) {
  const textValue = inputElement.value.trim();
  if (textValue == null || textValue === "") {
    showErrorMessage(
      inputElement,
      containerElement,
      "This field cannot be empty.",
    );
    return null;
  } else if (maxLength !== undefined && textValue.length > maxLength) {
    showErrorMessage(
      inputElement,
      containerElement,
      `The input is too long (max. ${maxLength} characters allowed).`,
    );
    return null;
  }
  // Valid.
  return textValue;
}

function validateUrl(inputElement, containerElement) {
  let url;
  const urlString = inputElement.value.trim();
  try {
    url = decodeURIComponent(new URL(urlString));
  } catch (_) {
    showErrorMessage(
      inputElement,
      containerElement,
      "Invalid URL (don't forget to include the scheme, e.g., 'https://').",
    );
    return null;
  }
  // Valid.
  return url;
}

async function validateBangKey(oldBangKey, newBangKey) {
  if (!newBangKey) {
    return null;
  }
  const bangElement = document.querySelector(`.${FORM_FIELDS.BANG}`);
  if (newBangKey == null && oldBangKey === newBangKey) {
    return null;
  } else if (/\s/.test(newBangKey)) {
    showErrorMessage(
      bangElement,
      bangElement.parentNode,
      "The bang cannot contain whitespaces.",
    );
    return null;
  }
  const valid_bang = await browser.storage.sync.get(newBangKey).then(
    function onGot(item) {
      if (Object.keys(item).length > 0) {
        showErrorMessage(
          bangElement,
          bangElement.parentNode,
          "This bang already exists.",
        );
        return null;
      } else {
        // Valid.
        return getBangName(newBangKey);
      }
    },
    function onError(error) {
      return null;
    },
  );
  return valid_bang;
}

function getInputtedBang() {
  const newBang = {
    name: null,
    bang: null,
    targets: [],
  };
  newBang.name = document.querySelector(`.${FORM_FIELDS.NAME}`).value.trim();
  newBang.bang = document.querySelector(`.${FORM_FIELDS.BANG}`).value.trim();
  document.querySelectorAll(".target-url-container").forEach((container) => {
    const targetUrl = {};
    const baseUrl = container.querySelector(
      `.${FORM_FIELDS.BASE_URL}-checkbox`,
    ).checked;
    [FORM_FIELDS.URL, FORM_FIELDS.BASE_URL].forEach((className, index) => {
      const targetField = className === FORM_FIELDS.URL ? "url" : "baseUrl";
      // Nothing to validate.
      if (index === 1 && !baseUrl) {
        targetUrl[targetField] = null;
      } else {
        targetUrl[targetField] = container
          .querySelector(`.${className}`)
          .value.trim();
      }
    });
    targetUrl.urlEncodeQuery = container.querySelector(
      `.${FORM_FIELDS.URL_ENCODE_QUERY}`,
    ).checked;
    newBang.targets.push(targetUrl);
  });
  return newBang;
}

async function getAndValidateInputtedBang(last, mode) {
  hideAllErrorMessages();
  const newBang = {
    name: null,
    bang: null,
    targets: [],
  };
  // Validate name.
  const nameInput = document.querySelector(`.${FORM_FIELDS.NAME}`);
  newBang.name = validateEmptyOrTooLong(
    nameInput,
    nameInput.parentNode,
    LIMITS.MAX_LENGTH_NAME,
  );

  // Validate bang (Still left to check if the bang does not already exist. This
  // is done later.)
  const bangInput = document.querySelector(`.${FORM_FIELDS.BANG}`);
  let bang = validateEmptyOrTooLong(
    bangInput,
    bangInput.parentNode,
    LIMITS.MAX_LENGTH_NAME,
  )?.toLowerCase();
  if (mode === "add" || saveButton.bangKey !== getBangKey(bang)) {
    bang = await validateBangKey(saveButton.bangKey, getBangKey(bang));
  }
  newBang.bang = bang;

  // Validate target URLs.
  let allUrlsValid = true;
  document.querySelectorAll(".target-url-container").forEach((container) => {
    const targetUrl = {};
    const baseUrl = container.querySelector(
      `.${FORM_FIELDS.BASE_URL}-checkbox`,
    ).checked;
    [FORM_FIELDS.URL, FORM_FIELDS.BASE_URL].forEach((className, index) => {
      const targetField = className === FORM_FIELDS.URL ? "url" : "baseUrl";
      // Nothing to validate.
      if (index === 1 && !baseUrl) {
        targetUrl[targetField] = null;
      } else {
        const urlInput = container.querySelector(`.${className}`);
        const containerElement =
          index === 0 ? urlInput.parentNode.parentNode : urlInput.parentNode;
        let url = validateEmptyOrTooLong(
          urlInput,
          containerElement,
          LIMITS.MAX_LENGTH_URLS,
        );
        if (url != null) {
          url = validateUrl(urlInput, containerElement);
        }
        if ((className === FORM_FIELDS.URL || baseUrl) && url == null) {
          allUrlsValid = false;
        }
        targetUrl[targetField] = url;
      }
    });
    targetUrl.urlEncodeQuery = container.querySelector(
      `.${FORM_FIELDS.URL_ENCODE_QUERY}`,
    ).checked;
    newBang.targets.push(targetUrl);
  });
  newBang.order = mode === "add" ? last + 1 : last;
  if (newBang.name != null && newBang.bang != null && allUrlsValid) {
    return newBang;
  }
  return null;
}

function displayErrorAlert(error) {
  const errorMsg = "Error saving bang.";
  console.error(errorMsg, error.message);
  if (
    error.message.includes("QuotaExceededError") ||
    error.message.includes("QUOTA_BYTES")
  ) {
    alert(errorMsg + " The browser's storage limit has been reached.");
  } else {
    alert(`${errorMsg} ${error.message}`);
  }
}

async function saveCustomBang() {
  const saveButton = document.getElementById("save");
  const inputtedBang = await getAndValidateInputtedBang(
    saveButton.last,
    saveButton.mode,
  );
  if (inputtedBang != null) {
    const inputtedBangKey = getBangKey(inputtedBang.bang);
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
            [inputtedBangKey]: inputtedBang.targets,
          })
          .then(
            () => {
              window.location.assign("options.html");
            },
            function onError() {
              displayErrorAlert(error);
            },
          );
      },
      function onError(error) {
        displayErrorAlert(error);
      },
    );
  }
  return inputtedBang;
}

function attachEventListeners() {
  const urlContainers = document.querySelectorAll(".target-url-container");
  const urlOptionsContainers = document.querySelectorAll(
    ".url-options-container",
  );
  const expandButtons = document.querySelectorAll(".expand-button");
  expandButtons.forEach((button, index) => {
    if (button.getAttribute("listener") !== "true") {
      button.addEventListener("click", () => {
        button.classList.toggle("expanded");
        urlOptionsContainers[index].classList.toggle("expanded");
      });
      button.setAttribute("listener", "true");
    }
  });
  const deleteButtons = document.querySelectorAll(".delete-button");
  deleteButtons.forEach((button, index) => {
    if (button.getAttribute("listener") !== "true") {
      button.addEventListener("click", () => {
        urlContainers[index].remove();
        // Hide buttons if there is only one target URL.
        if (urlContainers.length <= LIMITS.MAX_NUMBER_URLS) {
          addUrlButton.disabled = false;
          addUrlButton.title = "";
          addUrlButton.classList.remove("disabled-button");
        }
        hideActionButtons(urlContainers);
      });
      button.setAttribute("listener", "true");
    }
  });

  const urls = document.querySelectorAll(".url");
  const baseUrls = document.querySelectorAll(".base-url");
  const baseUrlCheckboxes = document.querySelectorAll(".base-url-checkbox");
  baseUrlCheckboxes.forEach((checkbox, index) => {
    if (checkbox.getAttribute("listener") !== "true") {
      checkbox.addEventListener("change", (event) => {
        if (event.currentTarget.checked) {
          baseUrls[index].value =
            urls[index].value.length > 0
              ? new URL(urls[index].value).origin
              : "";
          baseUrls[index].style.display = "block";
        } else {
          baseUrls[index].style.display = "none";
        }
      });
      checkbox.setAttribute("listener", "true");
    }
  });

  // Allow to click on labels to toggle checkmarks.
  document.querySelectorAll(".bang-option-label").forEach((label) => {
    if (label.getAttribute("listener") !== "true") {
      label.addEventListener("click", () => {
        let parent = label.parentElement;
        if (parent.classList.contains("tooltip-label")) {
          parent = parent.parentElement.parentElement.parentElement;
        }
        const checkmark = parent.children[0];
        checkmark.checked = !checkmark.checked;
        checkmark.dispatchEvent(new Event("change"));
      });
      label.setAttribute("listener", "true");
    }
  });

  const container = document.getElementById("draggable-container");
  const moveUpButtons = document.querySelectorAll(".move-up-button");
  const moveDownButtons = document.querySelectorAll(".move-down-button");
  const reorderButtons = document.querySelectorAll(".reorder-button");
  urlContainers.forEach((urlContainer, index) => {
    if (moveUpButtons[index].getAttribute("listener") !== "true") {
      moveUpButtons[index].addEventListener("click", () => {
        const previousUrl = urlContainer.previousElementSibling;
        if (previousUrl) {
          urlContainer.parentNode.insertBefore(urlContainer, previousUrl);
        }
      });
      moveUpButtons[index].setAttribute("listener", "true");
    }
    if (moveDownButtons[index].getAttribute("listener") !== "true") {
      moveDownButtons[index].addEventListener("click", () => {
        const nextUrl = urlContainer.nextElementSibling;
        if (nextUrl) {
          urlContainer.parentNode.insertBefore(nextUrl, urlContainer);
        }
      });
      moveDownButtons[index].setAttribute("listener", "true");
    }
    if (reorderButtons[index].getAttribute("dragStartListener") !== "true") {
      reorderButtons[index].addEventListener("dragstart", (e) => {
        e.stopPropagation();
        urlContainer.classList.add("dragging");
        urlOptionsContainers.forEach((urlContainer) => {
          urlContainer.classList.remove("expanded");
        });
        expandButtons.forEach((expandButton) => {
          expandButton.classList.remove("expanded");
        });
        reorderButtons.forEach((reorderButton) => {
          reorderButton.style.opacity = 0.000001;
        });
      });
      reorderButtons[index].setAttribute("dragStarListener", "true");
    }
    if (reorderButtons[index].getAttribute("dragEndListener") !== "true") {
      reorderButtons[index].addEventListener("dragend", () => {
        urlContainer.classList.remove("dragging");
        reorderButtons.forEach((reorderButton) => {
          reorderButton.style.opacity = 1;
        });
      });
      reorderButtons[index].setAttribute("dragEndListener", "true");
    }
    hideActionButtons(urlContainers);
  });

  if (container.getAttribute("listener") !== "true") {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const dragging = document.querySelector(".dragging");
      if (afterElement == null) {
        container.appendChild(dragging);
      } else {
        container.insertBefore(dragging, afterElement);
      }
    });
    container.setAttribute("listener", "true");
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".target-url-container:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  }
}

function showErrorMessage(inputElement, containerElement, message) {
  const errorMessage = document.createElement("span");

  errorMessage.className = "error-message";
  errorMessage.textContent = message;

  inputElement.classList.add("error-input-border");
  containerElement.appendChild(errorMessage);
}

function hideAllErrorMessages() {
  document.querySelectorAll(".error-input-border").forEach((input) => {
    input.classList.remove("error-input-border");
  });
  document.querySelectorAll(".error-message").forEach((errorMessage) => {
    errorMessage.parentNode.removeChild(errorMessage);
  });
}

// Hide buttons if there is only one target URL.
function hideActionButtons(urlContainers) {
  urlContainers = document.querySelectorAll(".target-url-container");
  const deleteButtons = document.querySelectorAll(".delete-button");
  // Used in desktop.
  const reorderButtons = document.querySelectorAll(".reorder-button");
  // Used in mobile.
  const moveUpButtons = document.querySelectorAll(".move-up-button");
  const moveDownButtons = document.querySelectorAll(".move-down-button");

  if (urlContainers.length === 1) {
    moveUpButtons[0].style.display = "none";
    moveDownButtons[0].style.display = "none";
    reorderButtons[0].style.display = "none";
    deleteButtons[0].style.display = "none";
  } else {
    urlContainers.forEach((_, index) => {
      // Mobile?
      if (window.matchMedia("(hover: none)").matches) {
        moveUpButtons[index].style.display = "block";
        moveDownButtons[index].style.display = "block";
        reorderButtons[index].style.display = "none";
      } else {
        moveUpButtons[index].style.display = "none";
        moveDownButtons[index].style.display = "none";
        reorderButtons[index].style.display = "block";
      }
    });
    deleteButtons[0].style.display = "block";
  }
}

const addUrlButton = document.getElementById("add-url");
addUrlButton.addEventListener("click", () => {
  const urlContainers = document.getElementsByClassName("target-url-container");
  const lastUrlContainer = urlContainers[urlContainers.length - 1];
  // Clone and empty fields.
  const newUrlContainer = lastUrlContainer.cloneNode(true);
  newUrlContainer.querySelector(".url").value = "";
  newUrlContainer
    .querySelector(".url-options-container")
    .classList.remove("expanded");
  const baseUrlCheckbox = newUrlContainer.querySelector(".base-url-checkbox");
  baseUrlCheckbox.checked = false;
  baseUrlCheckbox.removeAttribute("listener");
  newUrlContainer.querySelectorAll(".bang-option-label").forEach((label) => {
    label.removeAttribute("listener");
  });
  newUrlContainer.querySelector(".base-url").style.display = "none";
  newUrlContainer.querySelector(".base-url").value = "";
  newUrlContainer.querySelector(".url-encode-query").checked = false;
  const reorderButton = newUrlContainer.querySelector(".reorder-button");
  reorderButton.removeAttribute("dragStarListener");
  reorderButton.removeAttribute("dragEndListener");
  reorderButton.style.display = "block";
  const moveUpButton = newUrlContainer.querySelector(".move-up-button");
  moveUpButton.removeAttribute("listener");
  const moveDownButton = newUrlContainer.querySelector(".move-down-button");
  moveDownButton.removeAttribute("listener");
  const expandButton = newUrlContainer.querySelector(".expand-button");
  expandButton.removeAttribute("listener");
  expandButton.classList.remove("expanded");
  const deleteButton = newUrlContainer.querySelector(".delete-button");
  deleteButton.removeAttribute("listener");
  deleteButton.style.display = "block";
  const errorMessages = newUrlContainer.querySelectorAll(".error-message");
  errorMessages.forEach((error) => {
    error.parentNode.removeChild(error);
    newUrlContainer
      .querySelector(".error-input-border")
      .classList.remove("error-input-border");
  });
  lastUrlContainer.after(newUrlContainer);
  if (urlContainers.length >= LIMITS.MAX_NUMBER_URLS) {
    addUrlButton.disabled = true;
    addUrlButton.title = "Maximum number of URLs reached";
    addUrlButton.classList.add("disabled-button");
  }
  attachEventListeners();
});

window.addEventListener("resize", () => {
  const urlContainers = document.querySelectorAll(".target-url-container");
  urlContainers.forEach((_, index) => {
    hideActionButtons(urlContainers);
  });
});

// If on mobile, the tooltips are opened when clicking on them, instead of
// hovering.
if (window.matchMedia("(hover: none)").matches) {
  const tooltips = document.querySelectorAll(".tooltip-text");
  window.addEventListener("click", (e) => {
    const tooltip =
      e.target.closest(".tooltip")?.parentNode?.parentNode?.nextElementSibling;
    tooltips.forEach((t) => {
      if (t !== tooltip) {
        t.classList.remove("show");
      }
    });
    if (tooltip != null && tooltip.classList.contains("tooltip-text")) {
      tooltip.classList.toggle("show");
    }
  });
}

const saveButton = document.getElementById("save");
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");
const last = Number(urlParams.get("last"));

document.body.addEventListener("pageloaded", () => {
  const initialBang = getInputtedBang();
  // Ask for confirmation upon unsaved changes.
  const beforeUnloadHandler = (e) => {
    if (JSON.stringify(getInputtedBang()) !== JSON.stringify(initialBang)) {
      e.preventDefault();
      // Included for legacy support, e.g. Chrome/Edge < 119.
      e.returnValue = true;
    }
  };
  window.addEventListener("beforeunload", beforeUnloadHandler);
  saveButton.addEventListener("click", () => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
  });
  document.getElementById("cancel").addEventListener("click", () => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
  });
  const keyHandler = async (e) => {
    // Save on Ctrl/Cmd + Enter.
    if ((e.ctrlKey || e.metaKey) && (e.keyCode === 13 || e.keyCode === 10)) {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      e.preventDefault();
      const bang = await saveCustomBang();
      if (bang == null) {
        // Add back the listener if the bang is not valid.
        window.addEventListener("beforeunload", beforeUnloadHandler);
      }
    }
    // Exit on Escape.
    else if (e.key === "Escape") {
      e.preventDefault();
      window.location.assign("options.html");
    }
  };
  document.body.addEventListener("keydown", keyHandler);
  saveButton.mode = mode;
  saveButton.bangKey = bangKey;
  saveButton.addEventListener("click", async (e) => {
    const bang = await saveCustomBang();
    if (bang == null) {
      // Add back the listener if the bang is not valid.
      window.addEventListener("beforeunload", beforeUnloadHandler);
    }
  });
});

let bangKey;
if (mode === "edit") {
  const title = document.getElementById("title");
  title.innerHTML = "Edit Custom Bang";
  document.title = "Yang! – Edit Bang";
  bangKey = getBangKey(urlParams.get("bang"));
  browser.storage.sync.get(bangKey).then(
    function onGot(item) {
      const bangInfo = item[bangKey];
      const name = document.querySelector(`.${FORM_FIELDS.NAME}`);
      name.value = bangInfo.name;
      const bang = document.querySelector(`.${FORM_FIELDS.BANG}`);
      bang.value = bangInfo.bang;
      const firstTargetUrlContainer = document.getElementsByClassName(
        "target-url-container",
      )[0];
      for (let i = 0; i < bangInfo.targets.length - 1; i++) {
        // Create as many URL containers as we need.
        firstTargetUrlContainer.after(firstTargetUrlContainer.cloneNode(true));
      }
      const targetUrls = document.querySelectorAll(`.${FORM_FIELDS.URL}`);
      const targetBaseUrlCheckboxes = document.querySelectorAll(
        `.${FORM_FIELDS.BASE_URL}-checkbox`,
      );
      const targetBaseUrls = document.querySelectorAll(
        `.${FORM_FIELDS.BASE_URL}`,
      );
      const urlEncodeQueryCheckboxes = document.querySelectorAll(
        `.${FORM_FIELDS.URL_ENCODE_QUERY}`,
      );
      bangInfo.targets.forEach((target, index) => {
        targetUrls[index].value = target.url;
        targetBaseUrlCheckboxes[index].checked = target.baseUrl != null;
        targetBaseUrls[index].style.display =
          target.baseUrl != null ? "block" : "none";
        targetBaseUrls[index].value =
          target.baseUrl != null ? target.baseUrl : "";
        urlEncodeQueryCheckboxes[index].checked = target.urlEncodeQuery;
      });
      attachEventListeners();
      saveButton.last = bangInfo.order;
      // Display page once everything is loaded.
      document.body.style.opacity = "1";
      document.body.dispatchEvent(new Event("pageloaded"));
    },
    function onError(error) {
      // TODO: Handle error.
    },
  );
} else {
  attachEventListeners();
  saveButton.last = last;
  document.querySelector(`.${FORM_FIELDS.NAME}`).focus(); // focus first field;
  // Display page once everything is loaded.
  document.body.style.opacity = "1";
  document.body.dispatchEvent(new Event("pageloaded"));
}
