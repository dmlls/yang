function exportSettings(settings) {
    const jsonString = JSON.stringify(settings, null, 2);
    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "");
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
    const reader = new FileReader();
  
    reader.onload = async (event) => {
      try {
        const neededFields = ["name", "url", "bang", "urlEncodeQuery", "order"];
        const readBangs = JSON.parse(event.target.result);
        for (const [bangName, bangInfo] of Object.entries(readBangs)) {
            if (!neededFields.every(key => Object.keys(bangInfo).includes(key))) {
                throw new SyntaxError("Malformed backup file.");
            }
            await browser.storage.sync.set({ [bangName]: bangInfo });
        }
        alert("Settings imported successfully!");
        window.location.href = "options.html";
      } catch (error) {
        console.error("Error importing settings:", error);
        alert("Error importing settings. Please make sure the file is a valid Yang backup.");
      }
    };
    reader.readAsText(file);
  }


const exportButton = document.getElementById("export");
exportButton.addEventListener("click", async () => {
    const settings = await browser.storage.sync.get();
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
