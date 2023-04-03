/* Copyright (C) 2023 Diego Miguel Lozano <hello@diegomiguel.me>
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

let bangs = {};

// Fetch Bangs from DuckDuckGo.
(async () => {
  const res = await fetch("https://duckduckgo.com/bang.js");
  bangs = await res.json();
  // Remap bangs to: bang -> target.
  bangs = bangs.map((item) => ({ [item.t]: item.u }));
  bangs = Object.assign({}, ...bangs);
  // "bang!" is mapped to the relative URL "/bang?q={{{s}}}"
  // "bangs!" correctly points to "https://duckduckgo.com/bang?q={{{s}}}"
  bangs["bang"] = bangs["bangs"];
})();

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);

    // Skip requests for suggestions.
    let skip = ["/ac/", "suggest", "/complete"].some((path) =>
      url.pathname.includes(path)
    );
    if (skip) {
      return;
    }
    // Different search engines use different params for the query.
    let params = ["q", "p", "query", "text"]
      .reduce((acc, param) => {
        let q = url.searchParams.get(param);
        // Some search engines include the query in the request body.
        if (!q) {
          let form = details?.requestBody?.formData;
          if (form != null && form.hasOwnProperty(param))
            q = details?.requestBody?.formData[param][0];
        }
        if (q != null) {
          acc.push(q);
        }
        return acc;
      }, [])
      .filter((a) => a);

    if (params.length == 0) {
      return;
    }

    let query = params[0];
    const searchTerms = query.split(" ");
    let bang = "";

    if (searchTerms) {
      if (searchTerms[0].startsWith("!")) {
        bang = searchTerms[0].substring(1);
        query = searchTerms.slice(1).join(" ");
      } else if (searchTerms[searchTerms.length - 1].startsWith("!")) {
        bang = searchTerms[searchTerms.length - 1].substring(1);
        query = searchTerms.slice(0, -1).join(" ");
      } else {
        return;
      }
    }
    if (bang.length > 0 && bangs.hasOwnProperty(bang)) {
      updateTab(
        details.tabId,
        `${bangs[bang].replace("{{{s}}}", query)}`
      );
    }
  },
  {
    urls: ["<all_urls>"],
  },
  ["requestBody"]
);

function updateTab(tabId, url) {
  let updateProperties = {
    loadReplace: true,
    url: url,
  };
  if (tabId != null) {
    browser.tabs.update(tabId, updateProperties);
  } else {
    browser.tabs.update(updateProperties);
  }
}
