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
  const res = await fetch(new Request("https://duckduckgo.com/bang.js"));
  bangs = await res.json();
  // Remap bangs to: bang -> target.
  bangs = bangs.map((item) => ({ [item.t]: item.u }));
  bangs = Object.assign({}, ...bangs);
})();

browser.webRequest.onBeforeRequest.addListener(
  ({ url }) => {
    const urlObj = new URL(url);
    // Some search engines use "?q=", others "?query=".
    const params = ["q", "query"]
      .map((p) => urlObj.searchParams.get(p))
      .filter((q) => q);
    if (params.length === 0) {
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
      }
    }

    if (bang.length > 0 && bangs.hasOwnProperty(bang)) {
      return {
        redirectUrl: `${bangs[bang].replace(
          "{{{s}}}",
          encodeURIComponent(query)
        )}`,
      };
    }
  },
  {
    urls: ["<all_urls>"],
  },
  ["blocking"]
);
