<p align="center">
   <a href="https://addons.mozilla.org/addon/yang-addon/">
      <img width="150" src="https://user-images.githubusercontent.com/22967053/218319779-f000b2b7-d083-4d19-89dc-ef1d60e2c8c2.png" alt="Yang! - Yet Another Bangs anywhere Firefox extension">
   </a>
</p>
<p align="center">
   <img width="750px" src="https://github.com/user-attachments/assets/f1a55ea4-5f39-4621-901c-aacb7683dc6d">
</p>
<h1 align="center">Yang!</h1>
<p align="center"><b>Yet Another Bangs anywhere extension</b></p>
<br>
<p align="center">
   <a href="https://addons.mozilla.org/addon/yang-addon/">
      <img width="202" src="img/firefox-banner.svg">
   </a>
   <a href="https://chromewebstore.google.com/detail/yang-yet-another-bangs-an/ecboojkidbdghfhifefbpdkdollfhicb">
      <img width="202" src="https://github.com/user-attachments/assets/6eb89957-a021-43e9-af7a-3bdfe3ce7d84" alt="Available in the Chrome Web Store">
   </a>
</p>

<br><br>

## 1. What is a Bang?

Citing DuckDuckGo, who first introduced them back in 2008:
> **Bangs are shortcuts that quickly take you to search results on other
> sites.** For example, when you know you want to search on another site like
> Wikipedia or Amazon, our bangs get you there fastest. A search for [`!w filter
> bubble`](https://duckduckgo.com/?q=!w+filter+bubble) will take you directly to
> Wikipedia.

<br>

## 2. How does the extension work?

Simply install the extension and use any of the supported [Kagi
Bangs](https://kbe.smaertness.net/).

<br>

Bangs can be used at the beginning or at the end of the query, e.g.:

```console
!gm here to closest restaurant
```

is equivalent to

```console
here to closest restaurant !gm
```

<br>

Bangs can also be triggered without any query, serving as a bookmark shortcut: 

```console
!bbc
```

<br>

## 3. Features

|Done? | Feature| Description |
|:-:|:-|:-|
|✅|**Kagi Bangs**| More than 13,500 default bangs included. |
|✅|**Custom Bangs**| You can create your own bangs or override defaults. |
|✅|**Custom Bang Symbol**| Define your own custom symbol(s) to trigger the bangs. |
|✅|**Multiple Target URLs**| Open multiple websites with a single bang. |
|✅|**Custom Base URL**| Specify which URL to open when the bang is triggered without arguments. |
|✅|**Fast Redirections**| Bangs are resolved locally, without Kagi as intermediary<sup>1</sup>. |
|✅|**Address Bar Trigger**| You can use bangs directly in the URL bar. |
|✅|**Search Engine Trigger**| Bangs also work from the search bar of your favorite search engine. |
|✅|**Backup and Restore**| Never lose your bangs. |
|✅|**Mobile Support**| Yang! is also available on [Firefox Android](https://addons.mozilla.org/en-US/android/addon/yang-addon/). |
|🔜|**Custom Search Engines**| Soon you will be able to add your own custom search engines. |

<sub><sup>1</sup> This greatly reduces the redirection times, as shown by
[DuckDuckGo !Bangs but
Faster](https://bangs-but-faster.inclushe.com/).</small></sub>

<br>

<br>

## 4. Supported Engines

Yang! will be triggered directly from your **address bar** and the **following
sites**:

| Name | URL |
|-|-|
| Google | https://www.google.com/
| Bing | https://www.bing.com/
| Yahoo | https://www.yahoo.com/
| Ecosia | https://www.ecosia.org/
| DuckDuckGo | https://duckduckgo.com/
| Brave Search | https://search.brave.com/
| Startpage | https://www.startpage.com/
| Swisscows | https://swisscows.com/
| SearX(NG) | https://searx.space/
| Mojeek | https://www.mojeek.com/
| Qwant | https://www.qwant.com/
| Kagi | https://kagi.com/
| You.com | https://you.com/
| Perplexity AI | https://www.perplexity.ai/
| Naver | https://www.naver.com/
| Baidu | https://www.baidu.com/
| Yandex | https://yandex.com/
| AOL | https://www.aol.com/
| Murena | https://spot.ecloud.global/ <br> https://spot.murena.io/
| MetaGer | https://metager.de/
| Dogpile | https://www.dogpile.com/
| Ask.com | https://www.ask.com/
| Seznam.cz | https://search.seznam.cz/
| Karma Search | https://karmasearch.org/
| Mullvad Leta | https://leta.mullvad.net/

Is your favorite search engine not on the list? [Open an
issue](https://github.com/dmlls/yang/issues/new/choose) and we'll add it!

<br>

## 5. FAQs

<details>
  <summary><b>Do bangs sync across devices?</b></summary>
  <p>Yes... and no. Bangs will sync across all the Firefox <i>desktop</i> browsers in which you are logged in with your Firefox account. However, the sync between desktop and mobile is <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1625257">currently unsupported</a>. As a workaround, you can create a backup on desktop and restore it on Android (or vice versa).</p>
</details>

<details>
  <summary><b>Why does Yang! need permissions on a 300+ sites?</b></summary>
  <p>Instead of requesting data access on <i>all</i> sites, we granularly
  specify the search-engine sites that Yang! supports (which yeah, they're quite
  a few). You can find which sites we request permissions for in the
  <a href="https://github.com/dmlls/yang/blob/main/manifest.json">
  <code>manifest.json</code></a>.</p>
</details>

<br>

## 6. Contributing

Contributions are always welcome! However, before getting started, please
carefully read the [contribution
guidelines](https://github.com/dmlls/yang/blob/main/CONTRIBUTING.md).

<br>

## 7. Related Extensions

If you don't like Yang!, there are many [other
options](https://addons.mozilla.org/en-US/firefox/search/?q=bangs), but these
were the most inspiring in the early development of Yang!:

- [`sophie-glk/bang`](https://github.com/sophie-glk/bang)
- [`Inclushe/duckduckgo-bangs-but-faster`](https://gitlab.com/Inclushe/duckduckgo-bangs-but-faster)
- [`vantezzen/bangs-for-google`](https://github.com/vantezzen/bangs-for-google)

<br>
<p align="center"><sub>-</sub></p>
<br>

<sub>Yang! logo is a modification of the original DuckDuckGo logo. Its use is
solely transformative, i.e., intended with a further purpose or different
character, and does not substitute under any circumstance for the original use
of the work.</sub>
