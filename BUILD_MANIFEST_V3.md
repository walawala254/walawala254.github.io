# Risk Intelligence Circuit v3 Build Manifest

Release-candidate source: `6c0cb61530b24f41c749805d4baa6436a939dbb6` plus Phase 8 release preparation and the verified Streamlit-access wording correction recorded in the final Phase 8 commits.

Generated reproducibly with Node.js 24.18.0, npm 11.16.0, Vite 8.1.5 and `npm ci && npm run build`. Sizes are raw bytes. Integrity values are the first 16 hexadecimal characters of each file's SHA-256 digest and are verification aids, not Subresource Integrity attributes.

| File | Bytes | Route or purpose | Classification | Delivery boundary | SHA-256 prefix |
| --- | ---: | --- | --- | --- | --- |
| `404.html` | 4,176 | Recovery document | Production | Public route | `e25f4d16aca39b72` |
| `about.html` | 8,570 | About route | Production | Public route | `dc2dbe99be0ceafe` |
| `assets/about_me-C7B2L4OF.webp` | 65,954 | Preferred portrait | Production | Requested by Home/About | `11a49833feb7d8a9` |
| `assets/about_me-CNkcDSs1.jpg` | 162,377 | Portrait fallback/social image | Production | Conditional fallback/crawler request | `a2fc083ac88cc004` |
| `assets/case-navigation-DZegkbIN.js` | 3,749 | Shared navigation/reveal entry | Production | Requested by public routes | `5be5e029d4fa6dd0` |
| `assets/home-DLhvC2vC.css` | 59,473 | Homepage design and motion CSS | Production | Home only | `f99089a68708fd9c` |
| `assets/home-C-pScSXT.js` | 8,300 | Homepage orchestration | Production | Home only | `ac97dafbcf946359` |
| `assets/modulepreload-polyfill-Dezn_h7o.js` | 698 | Vite preload compatibility | Production | Public routes as emitted | `785597bca2e7dd97` |
| `assets/motion-controller-ConZTje7.js` | 1,923 | Prototype choreography | Experimental | Isolated prototype visit only | `7a54f5c342516833` |
| `assets/portfolio-BH3qPFJK.css` | 24,868 | Portfolio/case-study styles | Production | Portfolio and case study only | `408dcd3836372052` |
| `assets/prototypeCanvas-Ckvn5Ph8.js` | 3,657 | Canvas prototype | Experimental | Isolated prototype visit only | `46ce9409f093a0af` |
| `assets/prototypes-CIsEWVYL.css` | 42,974 | Prototype lab styles | Experimental | Isolated prototype visit only | `2290509814562a9c` |
| `assets/prototypeSvg-CC2T-ORf.js` | 2,084 | SVG prototype | Experimental | Isolated prototype visit only | `2801708eb994e164` |
| `assets/prototypeThree-DOXC2XWt.js` | 3,871 | Three.js loader/lifecycle | Experimental | Isolated prototype visit only | `e46d1cdd51e90695` |
| `assets/script.js_v_2-BTdQLf09.js` | 121 | Shared module bridge | Production | Public internal routes | `808fd87e7095a2c7` |
| `assets/script-C0MHpmNb.css` | 33,744 | Shared public-route CSS | Production | Public internal routes | `ffd459cfcb106d79` |
| `assets/ScrollTrigger-DDi3XPDo.js` | 112,811 | GSAP/ScrollTrigger homepage runtime | Production | Home only; one request | `cca4324afe43f370` |
| `assets/three-core-C1PsRCit.js` | 524,460 | Procedural WebGL prototype | Experimental | Dynamic isolated prototype request only | `922ce2586d742419` |
| `case-studies/transaction-monitoring/index.html` | 35,742 | Flagship case study | Production | Public route | `eceedc986941086f` |
| `contact.html` | 8,089 | Contact route | Production | Public route | `6e90f8ce41944e98` |
| `favicon.svg` | 259 | Site icon | Production | Public shared asset | `0a2be9a773ff3c89` |
| `index.html` | 30,822 | Homepage | Production | Public root route | `7657c16839a88b37` |
| `portfolio.html` | 18,350 | Selected-work index | Production | Public route | `b757272d31c0f15c` |
| `prototypes/canvas-2d.html` | 6,844 | Canvas comparison | Experimental | Noindex; explicit visit only | `290e219ba58f5850` |
| `prototypes/index.html` | 3,401 | Prototype lab index | Experimental | Noindex; explicit visit only | `551f8ca491ab5169` |
| `prototypes/svg-css.html` | 6,928 | SVG/CSS comparison | Experimental | Noindex; explicit visit only | `c503ee9885eabea0` |
| `prototypes/three-js.html` | 6,781 | Three.js comparison | Experimental | Noindex; explicit visit only | `a9c02bdfd8a450c6` |
| `robots.txt` | 75 | Crawler policy | Production | Public crawler request | `eead8ff690f1b3e3` |
| `services.html` | 13,570 | Services route | Production | Public route | `6c5ef722060d2079` |
| `sitemap.xml` | 573 | Public route index | Production | Public crawler request | `954aefc742856a6e` |

Total: 30 files and 1,195,244 bytes. This is 401 bytes (+0.034%) above the Phase 7 artifact: 94 HTML bytes describe the hosted demo's possible Streamlit sign-in accurately, while 307 CSS bytes provide cross-platform 200% text reflow containment. Experimental files are intentionally present as documented technical evidence, but no production HTML preloads, links to or requests their chunks. No source map, quarantined raster, unused legacy raster, external font, Font Awesome file, local path, test report or temporary screenshot is present.
