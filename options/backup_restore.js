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
    try {
      const neededFields = ["name", "url", "bang", "urlEncodeQuery", "order"];
      const readBangs = JSON.parse(event.target.result);
      for (const [bangName, bangInfo] of Object.entries(readBangs)) {
        if (!neededFields.every((key) => Object.keys(bangInfo).includes(key))) {
          throw new SyntaxError("Malformed backup file.");
        }
        bangInfo.bang = bangInfo.bang.toLowerCase();
        await browser.storage.sync.set({ [bangName.toLowerCase()]: bangInfo });
      }
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
      const loadedBangs = {};
      let order = 0;
      for (const [, bang] of Object.entries(sortedBangs)) {
        loadedBangs[bang.bang.toLowerCase()] = {
          name: bang.name,
          url: bang.url,
          bang: bang.bang.toLowerCase(),
          urlEncodeQuery: bang.urlEncodeQuery,
          openBaseUrl: bang?.openBaseUrl ?? false,
          order,
        };
        order++;
      }
      return loadedBangs;
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
