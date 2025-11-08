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

import {
  PreferencePrefix,
  BangProviders,
  fetchSettings,
  getPage,
  getBangKey,
  searchBangs,
  sortBangs,
  Defaults,
} from "../utils.js";

const BangType = Object.freeze({
  CUSTOM: "custom",
  DEFAULT: "default",
});

// Support for Chromium.
if (typeof browser === "undefined") {
  globalThis.browser = chrome;
}

const url = new URL(window.location.href);
let pageNumber = Number(url.searchParams.get("page") ?? 1);
let bangType = url.searchParams.get("bangs") ?? BangType.CUSTOM;

const queryInput = document.getElementById("query");
const searchBar = queryInput.parentNode;
const clearButton = document.getElementById("clear-button");

const optionMenu = document.querySelector(".select-custom-default-bangs");
const selectButton = optionMenu.querySelector(".select-button");
const selectText = optionMenu.querySelector(".select-text");
const options = optionMenu.querySelectorAll(".option");

const actionButton = document.getElementById("action-button");
const showInactive = document.getElementById("show-inactive");

function addPageIndicator(indicator) {
  const paginationDiv = document.getElementById("pagination");
  const page = document.createElement("a");
  page.textContent = indicator;
  if (typeof indicator !== "string") {
    if (indicator === pageNumber) {
      page.style.setProperty("color", "#0000ff");
      page.style.setProperty("background", "#ffffff");
    }
    page.addEventListener("click", changePage);
  } else {
    page.classList.add("ellipses");
    page.style.setProperty("cursor", "default");
  }
  paginationDiv.appendChild(page);
}

async function displayBangs(totalPages, bangs) {
  const tableBody = document.querySelector("#bangs-table tbody");
  tableBody.innerHTML = "";
  // Show pagination numbers (only if more than 1 page).
  const paginationDiv = document.getElementById("pagination");
  paginationDiv.innerHTML = "";
  if (pageNumber > totalPages) {
    pageNumber = totalPages;
    url.searchParams.set("page", pageNumber);
    history.replaceState({}, "", url);
  }
  if (bangs.length > 0) {
    toggleNoBangsMessage(false);
    const inactiveBangs =
      bangType === BangType.CUSTOM
        ? []
        : (await browser.storage.session.get(PreferencePrefix.INACTIVE_BANGS))[
            PreferencePrefix.INACTIVE_BANGS
          ];
    for (const b of bangs) {
      const row = tableBody.insertRow();
      const nameCell = row.insertCell(0);
      const bangCell = row.insertCell(1);
      const actionsCell = row.insertCell(2);

      const name = document.createElement("span");
      name.textContent = b.name;
      nameCell.appendChild(name);

      const bang = document.createElement("code");
      bang.classList.add("bang");
      bang.textContent = b.bang;
      bang.addEventListener("click", () => copyBang(bang));
      bangCell.appendChild(bang);

      if (bangType === BangType.CUSTOM) {
        const editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.title = "Edit";
        editButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 18 18">
              <path d="m 17.541585,3.6260358 c 0.61122,0.6112197 0.61122,1.6023974 0,2.2136172 L 7.4771988,15.904431 1.377523,17.944308 C 0.56047635,18.21744 -0.2174397,17.439524 0.05569179,16.622477 L 2.0955692,10.523193 12.160347,0.45841481 c 0.61122,-0.61121975 1.602398,-0.61121975 2.213618,0 z M 11.702128,4.7909533 4.4887959,12.003894 3.822402,13.996424 4.0035766,14.177598 5.9961061,13.511204 13.209438,6.2978722 Z"/>
          </svg>`;
        editButton.addEventListener("click", editBang, false);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.title = "Delete";
        deleteButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 18 18">
              <path d="M 8.9960938,0 C 7.3877879,0 6.1550888,1.0820111 5.6152344,2.4824219 H 3.0332031 c -0.038189,-0.00241 -0.082462,-0.00791 -0.1132812,-0.00781 h -0.00781 -0.00586 c -0.022702,4.674e-4 -0.06027,0.00577 -0.089844,0.00781 H 1.4238281 c -1.8977857,-0.025626 -1.89778566,2.7775807 0,2.7519531 H 1.65625 l 1.0234375,10.087891 c 0.1582392,1.564364 1.5314783,2.736328 3.1230469,2.736328 H 12.1875 c 1.591571,0 2.964897,-1.172095 3.123047,-2.736328 L 16.333984,5.234375 h 0.232422 c 1.897786,0.025628 1.897786,-2.7775805 0,-2.7519531 h -1.40039 l 0.115234,0.00977 c -0.145457,-0.022535 -0.293997,-0.022534 -0.439453,0 l 0.115234,-0.00977 H 12.375 C 11.835643,1.0821394 10.6047,-1.0584005e-8 8.9960938,0 Z m -4.515625,5.234375 h 9.0273432 l -0.99414,9.816406 c -0.01237,0.12231 -0.142551,0.25586 -0.326172,0.25586 H 5.8027344 c -0.1815854,0 -0.3139852,-0.135382 -0.3261719,-0.25586 z"/>
          </svg>`;
        deleteButton.addEventListener("click", deleteBang, false);

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
      } else {
        // Default bangs
        name.title = b.targets[0].url;
        const toggleActiveBangButton = document.createElement("button");
        const bangState = document.createElement("code");
        toggleActiveBangButton.className = "active-bang-status";
        toggleActiveBangButton.bang = b.bang;
        if (inactiveBangs.includes(b.bang)) {
          toggleActiveBangButton.title = "The bang is inactive";
          toggleActiveBangButton.classList.add("inactive");
          toggleActiveBangButton.bangActive = false;
        } else {
          toggleActiveBangButton.title = "The bang is active";
          toggleActiveBangButton.bangActive = true;
        }
        toggleActiveBangButton.addEventListener(
          "click",
          (e) => {
            const bang =
              e.target.tagName === "BUTTON"
                ? e.target.bang
                : e.target.parentElement.bang;
            if (toggleActiveBangButton.bangActive) {
              inactiveBangs.push(bang);
              toggleActiveBangButton.title = "The bang is inactive";
            } else {
              inactiveBangs.splice(inactiveBangs.indexOf(bang), 1);
              toggleActiveBangButton.title = "The bang is active";
            }
            toggleActiveBangButton.classList.toggle("inactive");
            toggleActiveBangButton.bangActive =
              !toggleActiveBangButton.bangActive;
            browser.storage.session.set({
              [PreferencePrefix.INACTIVE_BANGS]: inactiveBangs,
            });
            browser.storage.sync.set({
              [PreferencePrefix.INACTIVE_BANGS]: inactiveBangs,
            });
            bangState.textContent = toggleActiveBangButton.bangActive
              ? "ON"
              : "OFF";
          },
          false,
        );
        bangState.textContent = toggleActiveBangButton.bangActive
          ? "ON"
          : "OFF";
        toggleActiveBangButton.appendChild(bangState);
        actionsCell.appendChild(toggleActiveBangButton);
      }
    }
    // Page indicator.
    if (totalPages > 1) {
      let start = 1;
      let end = totalPages;
      if (pageNumber > 5) {
        if (pageNumber < totalPages - 4) {
          start = pageNumber - 2;
        } else {
          start = totalPages - 6;
        }
      }
      if (pageNumber < 6 && totalPages > 9) {
        end = 7;
      } else if (totalPages > 9 && pageNumber < totalPages - 4) {
        end = pageNumber + 2;
      }
      if (start !== 1) {
        addPageIndicator(1);
        addPageIndicator("…");
      }
      for (let i = start; i <= end; i++) {
        addPageIndicator(i);
      }
      if (end !== totalPages) {
        addPageIndicator("…"); // ellipsis
        addPageIndicator(totalPages);
      }
    }
  } else {
    toggleNoBangsMessage(true);
  }
}

async function actionButtonHandler() {
  if (bangType === BangType.CUSTOM) {
    window.location.assign("add_edit_bang.html?mode=add");
  } else {
    pageNumber = 1;
    toggleSpinner(true);
    if (!showInactive.filtered) {
      url.searchParams.set("inactive", true);
      await loadPage(false, false, true, true);
      showInactive.firstElementChild.innerHTML = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
        >
          <path
            d="M3.04.668c-.64 0-1.261.227-1.704.668-.443.44-.668 1.06-.668 1.7 0 .576.194 1.037.384 1.415a.95.95 0 0 0 .141.21l7.753 8.696v7.608c0 .64.227 1.262.668 1.704.444.442 1.065.663 1.704.663.814-.067 1.483-.474 2.128-.935a.941.941 0 0 0 .194-1.344c-.31-.403-.888-.442-1.33-.138a5.132 5.132 0 0 1-.605.366h-.003a3.746 3.746 0 0 1-.386.162h-.005l-.007.002h-.005a.67.67 0 0 1-.222-.035.327.327 0 0 1-.2-.2.676.676 0 0 1-.037-.245v-7.969a.947.947 0 0 0-.241-.626L2.726 3.537l-.003-.003a3.91 3.91 0 0 1-.157-.49l-.002-.009-.002-.005v-.004l-.003-.005v-.005l-.002-.002v-.002h.002a.65.65 0 0 1 .038-.218.322.322 0 0 1 .082-.122.323.323 0 0 1 .12-.08.594.594 0 0 1 .18-.035H20.88c.167 0 .296.007.336.01.116.112.194.26.222.419v.007l.003.012a.226.226 0 0 1-.075.206l-.005.007-.01.005c-.018.018-.031.037-.04.047l-.417.34a.878.878 92.957 0 0-.068 1.301 1.037 1.037 1.124 0 0 1.4.028l.513-.43a2.194 2.194 0 0 0 .586-1.708 2.593 2.593 0 0 0-.773-1.573 1.935 1.935 0 0 0-.915-.504C21.338.66 21.09.668 20.88.668z"
            style="fill: #fff"
          />
          <path
            d="M21.443 7.473c-.321 0-.64.125-.88.367l-3.06 3.056-3.054-3.054a1.24 1.24 0 0 0-1.762 0 1.243 1.243 0 0 0 0 1.758l3.057 3.058-3.057 3.059a1.245 1.245 0 0 0 1.76 1.76l3.057-3.059 3.058 3.059a1.244 1.244 0 0 0 1.762 0 1.244 1.244 0 0 0 0-1.762l-3.058-3.057L22.324 9.6a1.243 1.243 0 0 0 0-1.76 1.242 1.242 0 0 0-.88-.367z"
            style="fill: #fff"
            transform="translate(.044 -.624) scale(1.05063)"
          />
        </svg>
      `;
      showInactive.lastElementChild.textContent = "Show All";
    } else {
      url.searchParams.delete("inactive");
      await loadPage(false, false, true, false);
      showInactive.firstElementChild.innerHTML = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
        >
          <path
            d="M3.04.667c-.64 0-1.26.228-1.703.669-.443.44-.67 1.059-.67 1.698 0 .577.196 1.039.386 1.417a.95.95 0 0 0 .14.21l7.752 8.697v7.608c0 .64.229 1.26.67 1.702.444.442 1.065.665 1.704.665.589 0 1.007-.246 1.281-.383a.952.952 0 0 0 .12-.069l1.512-1.057v-.003c.637-.482.889-1.235.889-1.85V13.21l7.617-8.7a2.194 2.194 0 0 0 .586-1.71 2.593 2.593 0 0 0-.772-1.573 1.935 1.935 0 0 0-.914-.502c-.299-.064-.547-.058-.757-.058Zm-.06 1.89h17.9c.167 0 .295.008.335.01a.772.772 0 0 1 .224.42v.007l.002.01a.226.226 0 0 1-.076.207l-.005.006-.008.005c-.018.018-.033.037-.041.047l-7.85 8.967a.942.942 0 0 0-.234.62v7.116a.63.63 0 0 1-.027.228c-.016.037-.036.068-.119.123l-.022.014-.001.002-1.354.943h-.002a3.745 3.745 0 0 1-.386.16l-.006.001-.005.002H11.3a.67.67 0 0 1-.224-.036.327.327 0 0 1-.199-.199.676.676 0 0 1-.038-.244v-7.97a.947.947 0 0 0-.24-.626L2.725 3.536l-.002-.002a3.91 3.91 0 0 1-.157-.49l-.002-.008-.002-.006v-.005l-.002-.004v-.005l-.002-.002v-.003h.002a.65.65 0 0 1 .036-.217.322.322 0 0 1 .082-.121.323.323 0 0 1 .12-.08.594.594 0 0 1 .181-.036z"
            style="fill: #fff"
          />
        </svg>
      `;
      showInactive.lastElementChild.textContent = "Show Inactive";
    }
    showInactive.filtered = !showInactive.filtered;
    history.pushState({}, "", url);
    toggleSpinner(false);
  }
}

function editBang(e) {
  const row = e.currentTarget.parentNode.parentNode;
  const bang = row.cells[1].textContent;
  window.location.assign(`add_edit_bang.html?mode=edit&bang=${bang}`);
}

function deleteBang(e) {
  const row = e.currentTarget.parentNode.parentNode;
  const bangKey = getBangKey(row.cells[1].textContent);
  // Retrieve bang to be able to undo deletion.
  browser.storage.sync.get(bangKey).then(
    function onGot(item) {
      if (Object.hasOwn(item, bangKey)) {
        const bang = item[bangKey];
        browser.storage.sync.remove(bangKey).then(
          function onRemoved() {
            browser.storage.session.remove(bangKey).then(
              async function onRemoved() {
                const table = document.getElementById("bangs-table");
                let increasePage = false;
                if (table.rows.length === 2 && pageNumber > 1) {
                  // Last row in the page -> Decrease page number.
                  pageNumber--;
                  // If deletion is undone -> Increase page back.
                  increasePage = true;
                }
                const toastMessage = document.createElement("div");
                toastMessage.appendChild(
                  document.createTextNode("Bang\xA0\xA0"),
                );
                const bangName = document.createElement("code");
                bangName.classList.add("bang");
                bangName.textContent = bang.bang;
                toastMessage.appendChild(bangName);
                toastMessage.appendChild(
                  document.createTextNode("\xA0\xA0deleted."),
                );
                await loadPage(undefined, undefined, true);
                displayToast(bangKey, toastMessage, "Undo", undoDeletion, [
                  increasePage,
                  bang,
                ]);
                await fetchSettings(true);
              },
              function onError() {
                // TODO: Handle errors.
              },
            );
          },
          function onError() {
            // TODO: Handle errors.
          },
        );
      }
    },
    function onError(error) {
      // TODO: Handle error.
    },
  );
}

function undoDeletion([increasePage, bang, timeoutId]) {
  const bangKey = getBangKey(bang.bang);
  browser.storage.sync.set({ [bangKey]: bang }).then(
    function onSet() {
      browser.storage.session
        .set({
          [bangKey]: bang,
        })
        .then(
          async function onSet() {
            if (increasePage) {
              pageNumber++;
            }
            await loadPage(undefined, undefined, true);
            hideToast();
            clearTimeout(timeoutId);
          },
          function onError() {},
        );
    },
    function onError(error) {},
  );
}

function displayToast(
  toastId,
  messageElement,
  actionText = null,
  actionCallback = null,
  argsCallback = null,
  hideAfter = 5000,
) {
  hideToast();
  toastId = `toast-${toastId}`;
  const toastContainer = document.createElement("div");
  toastContainer.id = toastId;
  toastContainer.classList.add("toast-container");
  messageElement.classList.add("toast-message");
  toastContainer.appendChild(messageElement);
  // Remove toast after a delay.
  const timeoutId = setTimeout(() => hideToast(toastId), hideAfter);
  if (actionText != null && actionCallback != null && argsCallback != null) {
    const buttonId = `undo-button-${toastId}`;
    const undoButton = document.createElement("button");
    undoButton.id = buttonId;
    undoButton.textContent = actionText;
    undoButton.addEventListener("click", () =>
      actionCallback([...argsCallback, timeoutId]),
    );
    toastContainer.appendChild(undoButton);
  }
  document.body.appendChild(toastContainer);
}

function hideToast(toastId) {
  // If not toast id is passed, we hide all toasts.
  const toasts =
    toastId == null
      ? document.querySelectorAll('[id^="toast-"]')
      : [document.getElementById(toastId)];
  for (const toast of toasts) {
    if (toast != null) {
      toast.remove();
    }
  }
}

function copyBang(element) {
  const bang = element.innerText;
  const toastMessage = document.createElement("div");
  toastMessage.appendChild(
    document.createTextNode("Bang copied to clipboard."),
  );
  // Use the Clipboard API to copy the text.
  navigator.clipboard
    .writeText(bang)
    .then(displayToast(`copy-${bang}`, toastMessage, null, null, null, 2000))
    .catch(function (err) {
      console.error("Could not copy text: ", err);
    });
}

function toggleNoBangsMessage(visible) {
  const noBangsMessage = document.getElementById("no-bangs");
  const searching = url.searchParams.get("q") !== null;
  const inactiveFiltered = url.searchParams.get("inactive");
  const defaultBangs = url.searchParams.get("bangs") === "default";
  if (visible) {
    if (searching) {
      noBangsMessage.textContent = "No results found";
    } else if (inactiveFiltered) {
      noBangsMessage.textContent = "No inactive bangs";
    } else if (defaultBangs) {
      noBangsMessage.textContent = "Default bangs could not be loaded";
    } else {
      noBangsMessage.textContent = "Click on + Add Bang to get started";
    }
    noBangsMessage.style.display = "block";
  } else {
    noBangsMessage.style.display = "none";
  }
}

async function loadBangs(onlyInactive = false) {
  const inactiveBangs =
    bangType === BangType.CUSTOM
      ? []
      : (await browser.storage.session.get(PreferencePrefix.INACTIVE_BANGS))[
          PreferencePrefix.INACTIVE_BANGS
        ];
  const allBangs =
    bangType === BangType.CUSTOM
      ? await browser.storage.sync.get()
      : await browser.storage.session.get();
  return Object.entries(allBangs)
    .filter(
      (entry) =>
        entry[0].startsWith(PreferencePrefix.BANG) &&
        ((bangType === BangType.CUSTOM && !entry[1].default) ||
          (bangType === BangType.DEFAULT &&
            entry[1].default &&
            (!onlyInactive || inactiveBangs.includes(entry[1].bang)))),
    )
    .map((entry) => entry[1]);
}

async function loadPage(
  updateURL = true,
  fullLoad = false,
  reloadBangs = false,
  onlyInactive = false,
) {
  bangType = url.searchParams.get("bangs") ?? BangType.CUSTOM;
  // Sync contains only custom bangs, while session contains also default bangs.
  if (fullLoad) {
    const bangProvider =
      (await browser.storage.sync.get(PreferencePrefix.BANG_PROVIDER))[
        PreferencePrefix.BANG_PROVIDER
      ] ?? Defaults.BANG_PROVIDER;
    console.log(bangProvider);
    const defaultBangsOption = document.getElementById(
      BangType.DEFAULT,
    ).parentElement;
    if (bangProvider === BangProviders.NONE.id) {
      defaultBangsOption.removeEventListener("click", bangTypeSelectedHandler);
      defaultBangsOption.classList.add("disabled");
      defaultBangsOption.title = "No bang provider selected";
    } else {
      defaultBangsOption.addEventListener("click", bangTypeSelectedHandler);
      defaultBangsOption.classList.remove("disabled");
      defaultBangsOption.removeAttribute("title");
    }
  }
  if (reloadBangs) {
    bangs = await loadBangs(onlyInactive);
  }
  url.searchParams.set("bangs", bangType);
  history.replaceState({}, "", url);
  let processedBangs = [];
  const query = url.searchParams.get("q") ?? "";
  if (query !== "") {
    processedBangs = searchBangs(bangs, query);
  } else {
    if (document.activeElement !== queryInput) {
      clearButton.style.display = "none";
      searchBar.classList.remove("searching");
    }
    // Get only the bang values, sorted alphabetically (by name and bang).
    processedBangs = sortBangs(bangs);
    if (updateURL) {
      url.searchParams.set("page", pageNumber);
      history.pushState({}, "", url);
    }
  }
  const pageBangs = getPage(processedBangs, pageNumber);
  displayBangs(pageBangs.totalPages, pageBangs.page);
}

function changePage(e) {
  pageNumber = Number(e.target.textContent);
  url.searchParams.set("page", pageNumber);
  url.searchParams.set("bangs", bangType);
  window.location.assign(url);
}

function toggleSpinner(show) {
  if (show) {
    document.querySelector("#bangs-table tbody").innerHTML = "";
    document.getElementById("pagination").innerHTML = "";
    document.getElementById("button-spinner").style.display = "block";
  } else {
    document.getElementById("button-spinner").style.display = "none";
  }
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function runSearch(query) {
  if (query !== "") {
    url.searchParams.set("q", query);
    history.pushState({}, "", url);
  } else {
    url.searchParams.delete("q");
  }
  loadPage(false);
}

function clearSearch(focusInput = true, fullLoad = false) {
  // debouncedSearch("");
  clearButton.style.display = "none";
  queryInput.value = "";
  url.searchParams.delete("q");
  history.pushState({}, "", url);
  loadPage(false, fullLoad, fullLoad);
  if (focusInput) {
    queryInput.focus();
  }
}

function bangTypeSelectedHandler(e) {
  const selectedOption =
    e.target.id === "" ? e.target.querySelector(".option-text") : e.target;
  pageNumber = 1;
  if (bangType !== selectedOption.id) {
    bangType = selectedOption.id;
    url.searchParams.set("page", pageNumber);
    url.searchParams.set("bangs", bangType);
    url.searchParams.delete("q");
    url.searchParams.delete("inactive");
    window.location.assign(url);
  }
  optionMenu.classList.remove("active");
}

// Focus search with F3 or Ctrl + F.
window.addEventListener("keydown", (e) => {
  if (e.key === "F3" || (e.ctrlKey && e.key === "f")) {
    queryInput.focus();
    e.preventDefault();
  } else if (e.key === "Escape") {
    queryInput.blur();
    e.preventDefault();
  }
});
window.onpopstate = (e) => {
  clearSearch();
  queryInput.blur();
  e.preventDefault();
};

if (bangType === BangType.CUSTOM) {
  document.getElementById("show-inactive").style.display = "none";
  document.getElementById("add-bang").style.display = "flex";
} else {
  document.getElementById("add-bang").style.display = "none";
  document.getElementById("show-inactive").style.display = "flex";
}

// Search bar (expand/shrink animation).
queryInput.addEventListener("focus", () => {
  searchBar.classList.add("searching");
});
queryInput.addEventListener("focusout", () => {
  if (queryInput.value === "") {
    searchBar.classList.remove("searching");
  }
});
const query = url.searchParams.get("q") ?? "";
if (query !== "") {
  searchBar.classList.add("searching");
  clearButton.style.display = "block";
  // If we are doing a full load, set the search query in the input.
  queryInput.value = query;
}

// Custom / Default Bangs Menu
selectText.textContent = document.getElementById(bangType).textContent;
selectButton.addEventListener("click", (e) => {
  optionMenu.classList.toggle("active");
  e.stopPropagation();
});
options.forEach((option) => {
  option.addEventListener("click", bangTypeSelectedHandler);
});
// Close the menu when clicking outside of it.
window.addEventListener("click", (e) => {
  if (!e.target.parentElement.classList.contains("option")) {
    optionMenu.classList.remove("active");
  }
});

actionButton.addEventListener("click", actionButtonHandler, false);
showInactive.filtered = url.searchParams.get("inactive") ?? false;
if (showInactive.filtered) {
  showInactive.lastElementChild.textContent = "Show All";
}

// Wait to run search for a small time after the user has stopped typing.
const debouncedSearch = debounce(runSearch, 300); // delay in ms
queryInput.addEventListener("input", () => {
  if (queryInput.value !== "") {
    clearButton.style.display = "block";
  } else {
    clearButton.style.display = "none";
  }
  debouncedSearch(queryInput.value);
});
clearButton.addEventListener("click", clearSearch);
document.getElementById("yang-logo").addEventListener("click", () => {
  pageNumber = 1;
  bangType = BangType.CUSTOM;
  url.searchParams.set("page", pageNumber);
  url.searchParams.set("bangs", bangType);
  history.replaceState({}, "", url);
  selectText.textContent = document.getElementById(bangType).textContent;
  url.searchParams.delete("inactive");
  document.getElementById("show-inactive").style.display = "none";
  document.getElementById("add-bang").style.display = "flex";
  clearSearch(false, true);
});

// Initial load.
let bangs = await loadBangs();
await loadPage(false, true, showInactive.filtered, showInactive.filtered);
document.getElementById("button-spinner").style.display = "none";
