function onGot(allBangs) {
  // Get only the bang values, sorted by order.
  const sortedBangs = Object.entries(allBangs)
    .sort((a, b) => a[1].order - b[1].order)
    .map((entry) => entry[0]);
  if (sortedBangs.length === 0) {
    const noBangsLabel = document.getElementById("no-bangs");
    noBangsLabel.style.visibility = "visible";
  } else {
    for (const b of sortedBangs) {
      const tableBody = document.querySelector("#bangs-table tbody");
      const row = tableBody.insertRow();
      const nameCell = row.insertCell(0);
      const bangCell = row.insertCell(1);
      const actionsCell = row.insertCell(2);

      const name = document.createTextNode(allBangs[b].name);
      nameCell.appendChild(name);

      const bang = document.createElement("code");
      bang.classList.add("bang");
      bang.textContent = `!${allBangs[b].bang}`;
      bangCell.appendChild(bang);

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
    }
    const last = allBangs[sortedBangs.at(-1)].order; // order of the most recent bang
    const addBangButton = document.getElementById("add-bang");
    addBangButton.last = last;
  }
}

// TODO: Handle errors.
function onError(error) {
  console.log(`Error: ${error}`);
}

function addBang(e) {
  window.location.replace(
    `add_edit_bang.html?mode=add&last=${e.currentTarget.last}`,
  );
}

function stripExclamation(string) {
  return string.replace(/^!+|!+$/g, "");
}

function editBang(e) {
  const row = e.currentTarget.parentNode.parentNode;
  const bang = row.cells[1].textContent;
  const addBangButton = document.getElementById("add-bang");
  window.location.replace(
    `add_edit_bang.html?mode=edit&bang=${bang}&last=${addBangButton.last}`,
  );
}

function deleteBang(e) {
  const row = e.currentTarget.parentNode.parentNode;
  const bangName = stripExclamation(row.cells[1].textContent);
  // Retrieve bang to be able to undo deletion.
  browser.storage.sync.get(bangName).then(
    function onGot(item) {
      const bang = item[bangName];
      browser.storage.sync.remove(bangName).then(
        function onRemoved() {
          row.remove();
          displayToast(
            bangName,
            `Bang '${bangName}' deleted.`,
            "Undo",
            undoDeletion,
            bang,
          );
        },
        function onError() {
          // TODO: Handle errors.
        },
      );
    },
    function onError(error) {
      // TODO: Handle error.
    },
  );
  const table = document.getElementById("bangs-table");
  if (table.rows.length === 2) {
    // Empty table.
    window.location.reload();
  }
}

function undoDeletion(bang) {
  browser.storage.sync.set({ [bang.bang]: bang }).then(
    function setItem() {
      window.location.reload();
    },
    function onError() {
      // TODO: Handle error.
    },
  );
}

function displayToast(
  toastId,
  message,
  actionText,
  actionCallback,
  argsCallback,
) {
  hideToast(toastId);
  const buttonId = `undo-button-${toastId}`;
  const body = document.getElementsByTagName("body")[0];
  body.insertAdjacentHTML(
    "beforeend",
    `<div id="${toastId}" class="toast-container">
            <div class="toast-message">${message}</div> 
            <button id="${buttonId}">${actionText}</button>
        </div></body>`,
  );
  const undoButton = document.getElementById(buttonId);
  undoButton.addEventListener("click", function () {
    actionCallback(argsCallback);
  });
  // Remove toast after a delay.
  setTimeout(function () {
    hideToast(toastId);
  }, 5000);
}

function hideToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast !== null) {
    toast.remove();
  }
}

function undoAction() {
  // Add logic to undo the action here
}

browser.storage.sync.get().then(onGot, onError);
const addBangButton = document.getElementById("add-bang");
addBangButton.addEventListener("click", addBang, false);
