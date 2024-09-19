## Steps

1. Please, **take a look at the** [**open pull
   Requests**](https://github.com/dmlls/yang/pulls) and make sure that your
   changes haven't been already proposed.
2. **Communication is key**: Before investing your time on any changes or
   implementation, [**start a
   discussion**](https://github.com/dmlls/yang/discussions/new?category=ideas)
   describing your idea and implementation details. We want to avoid anyone
   being hurt because they felt they "wasted their time" implementing a rejected
   feature.
3. Once you have implemented your changes:
   1.  Run the JavaScript linter (Node.js is required):
       ```console
       npx jshint *.js options/*.js
       ```
   2.  Run the CSS linter:
       ```console
       npx stylelint options/*.css
       ```
   3. Lint the extension:
      ```console
      npx web-ext lint
      ```
   5.  Format the code:
       ```console
       npx prettier . --write
       ```
4. **Test the extension** thoroughly on both desktop and Android.
5. Finally, open a pull request. Congratulations, you made it! 🥳

<br>

## Useful links

- [Debugging on Firefox
  Desktop](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing)
- [Debugging on Firefox
  Android](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/)
