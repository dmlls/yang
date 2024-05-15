<p align="center"><a href="https://addons.mozilla.org/addon/yang-addon/"><img width="256" src="https://user-images.githubusercontent.com/22967053/218319779-f000b2b7-d083-4d19-89dc-ef1d60e2c8c2.png" alt="Yang! - Yet Another Bangs anywhere Firefox extension"></a></p>

<p align="center"><a href="https://addons.mozilla.org/addon/yang-addon/"><img width="202" src="https://user-images.githubusercontent.com/22967053/218262747-3ef4af48-86c6-4e10-9e07-6b64b4910031.png" alt="Available on Firefox ADD-ONS"></a></p>

<h1 align="center">Yang!</h1>
<p align="center"><b>Yet Another Bangs anywhere Firefox extension</b></p>

<br>

||||
|-|-|-|
|![Bangs! Everywhere. Anywhere. Right from the URL bar or from your favorite search engine.](https://user-images.githubusercontent.com/22967053/218325173-06ec10b6-2776-41a4-ad2e-64ce5d7460ec.png)|![Blazingly fast redirections. Bangs are resolved locally, without DuckDuckGo as an intermediary.](https://user-images.githubusercontent.com/22967053/218325183-efb34a25-1018-472e-ac34-522af9309dd2.png)|![The numbers speak for themselves. More than 15 supported search engines and 13,500 bangs to choose from.](https://user-images.githubusercontent.com/22967053/218325186-2c5f8db0-e3bf-4727-9035-88343dc43c4b.png)|

<br><br>

## Really? Another one?

Was this necessary? Probably not. There are dozens of extensions that already
provide a similar functionality to Yang! (see [Related
Extensions](#related-extensions)).

**BUT**, I wasn't able to find one that simultaneously:

1. Allowed to set custom bangs.
2. Worked on my phone.
3. Supported bangs directly from the URL bar.
4. Redirected immediately, without querying to DuckDuckGo to resolve the
   bang<sup>1</sup>.
5. Worked on every major search engine out there.

Yang! is an add-on that doesn't feel old.

<sub><sup>1</sup> This greatly reduces the redirection times, as shown by
[DuckDuckGo !Bangs but Faster](https://bangs-but-faster.inclushe.com/).</small></sub>

<br>

## How does it work?

Simply install the extension and then use any of the supported [DuckDuckGo
bangs](https://duckduckgo.com/bangs).

<br>

Bangs can be used at the beginning or at the end of the query, e.g.:

```console
!deepl I love bangs and I'm not talking about hair.
```

is equivalent to

```console
I love bangs and I'm not talking about hair. !deepl
```

<br>

You can of course always create your own **custom bangs**!

<br>

Bangs are resolved locally, without sending any request to DuckDuckGo, which
makes the process much faster.

<br>

## Supported engines

Yang! will be triggered directly from your **URL bar** and the **following
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

Is your favorite search engine not on the list?
[Open an issue](https://github.com/dmlls/yang/issues/new/choose) and we'll add
it!

<br>

## FAQs

<details>
  <summary><b>Why does Yang! need permissions on a 300+ sites?</b></summary>
  <p>Instead of requesting data access on <i>all</i> sites, we granularly
  specify the search-engine sites that Yang! supports (which yeah, they're quite
  a few). You can find which sites we request permissions for in the
  <a href="https://github.com/dmlls/yang/blob/main/manifest.json">
  <code>manifest.json</code></a>.</p>
</details>

<details>
  <summary><b>Does it work on Google Chrome?</b></summary>
  <p>No clue, I don't have that package installed on my system. I will not
  give support to it myself, but PRs are welcome.</p>
</details>

<br>

## Related Extensions

There are [many](https://addons.mozilla.org/en-US/firefox/search/?q=bangs), but
these are the ones that were most inspiring:

- [`sophie-glk/bang`](https://github.com/sophie-glk/bang)
- [`Inclushe/duckduckgo-bangs-but-faster`](https://gitlab.com/Inclushe/duckduckgo-bangs-but-faster)
- [`vantezzen/bangs-for-google`](https://github.com/vantezzen/bangs-for-google)

<br>
<p align="center"><sub>-</sub></p>
<br>

<sub>Yang! logo is a modification of the original DuckDuckGo logo. Its use is
solely transformative, i.e., intended with a further purpose or different
character, and does not substitute under any circumstance for the original
use of the work.</sub>
