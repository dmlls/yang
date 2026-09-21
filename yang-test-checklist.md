### Yang – Checklist

Note: Ideally test things starting from clean data and pre-stored data.

- Add bang:

  - Fields:
    - Test validation, e.g., too long, incorrect URL, duplicated bang, etc.
  - Test bang.
  - Test Open Base URL.
  - Test URL Encode Query.
  - Test clicking on label for Open Base URL and URL Encode Query (create multiple targets).
  - Test confirmation of unsaved changes.

- Edit bang:

  - Fields:
    - Test validation, e.g., too long, incorrect URL, duplicated bang, etc.
  - Test bang.
  - Delete all target URLs. Make sure the reorder and delete buttons are no longer visible.

- Bang deletion:

  - Delete bang and check it no longer works or default has been restored.
  - Delete bang, undo, and check it still works.

- Settings:

  - Change bang symbol and check it works. Also, check the previous symbol does not work.
  - Backups:
    - Import:
      - Test with different import versions.
      - Test existent bangs are overwritten.
    - Check bang export.

- Test all [supported search engines](https://github.com/dmlls/yang#supported-engines).

- Test version number link.

- Test "Report a bug",

- Test UI on mobile.

- Testing multi-bangs and snaps:
  - ".s @r"
  - "@r .s"
  - ".g .s .ddg the query"
  - "the query .g .s .ddg"
  - .g .s .ddg @r the query
  - "@r the query .g .s .ddg" # Left side is preceded over right side
  - ".g .s .doesntexist @r the query" # Bangs not recognized are removed
  - "the query .g .s .doesntexist @r" # Bangs not recognized are removed
  - "the query .g @r .s .doesntexist" # Bangs and snap can be intercalated
  - "nothing else .s .ddg @r matters" # No bangs and snap must be detected
  - ".ddg @r @g the query .g .s" # If multiple snaps, only the first one is considered
  - " .s @g .ddg spaces should not matter "

- Test multi-bangs and snaps together with multiple-target bangs.

### Test on Mobile

adb devices
npx web-ext run -t firefox-android --adb-device dfeb9ca3 --firefox-apk org.mozilla.fenix

### Useful Links

- Loading extension on Android:
  - https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/
