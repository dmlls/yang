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
  if (textValue === "") {
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

async function validateDuplicatedBang(bang) {
  const bangElement = document.getElementById(FormFields.BANG);
  const valid = await browser.storage.sync.get(bang).then(
    function onGot(item) {
      if (Object.keys(item).length > 0) {
        showErrorMessage(bangElement, "Bang already exists.");
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
          value = validateEmptyOrTooLong(inputElement, 8);
          // Remove leading or trailing "!".
          value = stripExclamation(value).trim().toLowerCase();
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
  let newBang = {};
  const inputIds = Object.values(FormFields);
  const inputtedValues = inputIds.map((inputId) => getInputValue(inputId));
  let i;
  for (i = 0; i < inputIds.length; i++) {
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
  window.location.replace("options.html");
}

function onError() {}

async function saveCustomBang() {
  const saveButton = document.getElementById("save");
  const customBang = getInputtedBang(saveButton.last, saveButton.mode);
  let validBang;
  switch (saveButton.mode) {
    case "add":
      validBang = await validateDuplicatedBang(customBang.bang);
      break;
    case "edit":
      if (saveButton.bangName !== customBang.bang) {
        validBang = await validateDuplicatedBang(customBang.bang);
        // If the bang has changed and does not already exist ->
        // Delete the previous one.
        if (validBang) {
          validBang = await browser.storage.sync
            .remove(saveButton.bangName)
            .then(
              function onRemoved() {
                return true;
              },
              function onError() {
                // TODO: Handle errors.
              },
            );
        }
      } else {
        validBang = true;
      }
      break;
    default:
      break;
  }
  if (isInputtedBangValid(customBang) && validBang) {
    browser.storage.sync
      .set({ [customBang.bang]: customBang })
      .then(setItem, onError);
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
let bangName;
if (mode === "edit") {
  const title = document.getElementById("title");
  title.innerHTML = "Edit Custom Bang";
  document.title = "Yang! – Edit Bang";
  bangName = stripExclamation(urlParams.get("bang"));
  browser.storage.sync.get(bangName).then(
    function onGot(item) {
      const bang = item[bangName];
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
}
saveButton.mode = mode;
saveButton.bangName = bangName;
saveButton.addEventListener("click", saveCustomBang, false);

// Save with Ctrl+Enter or Cmd+Enter.
const inputFields = document.getElementsByClassName("input-field");
for (const field of inputFields) {
  field.onkeydown = saveOnCtrlEnter;
}
