# Risk Intelligence Circuit v3 Build Manifest

Release-candidate source: `6c0cb61530b24f41c749805d4baa6436a939dbb6` plus Phase 8 release preparation and the verified Streamlit-access wording correction recorded in the final Phase 8 commits.

Generated reproducibly with Node.js 24.18.0, npm 11.16.0, Vite 8.1.5 and `npm ci && npm run build`. Sizes are raw bytes. Integrity values are the first 16 hexadecimal characters of each file's SHA-256 digest and are verification aids, not Subresource Integrity attributes.

| File | Bytes | Route or purpose | Classification | Delivery boundary | SHA-256 prefix |
| --- | ---: | --- | --- | --- | --- |
| `404.html` | 4,176 | Recovery document | Production | Public route | `fbc1c1a7f5e1ab3e` |
| `about.html` | 8,570 | About route | Production | Public route | `f5fe9e7ef942db65` |
| `assets/about_me-C7B2L4OF.webp` | 65,954 | Preferred portrait | Production | Requested by Home/About | `11a49833feb7d8a9` |
| `assets/about_me-CNkcDSs1.jpg` | 162,377 | Portrait fallback/social image | Production | Conditional fallback/crawler request | `a2fc083ac88cc004` |
| `assets/case-navigation-DZegkbIN.js` | 3,749 | Shared navigation/reveal entry | Production | Requested by public routes | `5be5e029d4fa6dd0` |
| `assets/home-C9HvMRDo.css` | 59,405 | Homepage design and motion CSS | Production | Home only | `f5f9fe9321796d10` |
| `assets/home-DbSqjqnt.js` | 8,300 | Homepage orchestration | Production | Home only | `ac97dafbcf946359` |
| `assets/modulepreload-polyfill-Dezn_h7o.js` | 698 | Vite preload compatibility | Production | Public routes as emitted | `785597bca2e7dd97` |
| `assets/motion-controller-ConZTje7.js` | 1,923 | Prototype choreography | Experimental | Isolated prototype visit only | `7a54f5c342516833` |
| `assets/portfolio-BwCC2W6q.css` | 24,765 | Portfolio/case-study styles | Production | Portfolio and case study only | `857e8c516d04fa4c` |
| `assets/prototypeCanvas-Dg9z0p-z.js` | 3,657 | Canvas prototype | Experimental | Isolated prototype visit only | `46ce9409f093a0af` |
| `assets/prototypes-DIpkAcra.css` | 42,906 | Prototype lab styles | Experimental | Isolated prototype visit only | `0e49b8cbdbf4acd2` |
| `assets/prototypeSvg-NtMGD0a5.js` | 2,084 | SVG prototype | Experimental | Isolated prototype visit only | `2801708eb994e164` |
| `assets/prototypeThree-CCAbrqrE.js` | 3,871 | Three.js loader/lifecycle | Experimental | Isolated prototype visit only | `e46d1cdd51e90695` |
| `assets/script.js_v_2-BbZZC40U.js` | 121 | Shared module bridge | Production | Public internal routes | `808fd87e7095a2c7` |
| `assets/script-JIIQj_YW.css` | 33,676 | Shared public-route CSS | Production | Public internal routes | `ba6d7654141c2c64` |
| `assets/ScrollTrigger-DDi3XPDo.js` | 112,811 | GSAP/ScrollTrigger homepage runtime | Production | Home only; one request | `cca4324afe43f370` |
| `assets/three-core-C1PsRCit.js` | 524,460 | Procedural WebGL prototype | Experimental | Dynamic isolated prototype request only | `922ce2586d742419` |
| `case-studies/transaction-monitoring/index.html` | 35,742 | Flagship case study | Production | Public route | `723f66819ec7920f` |
| `contact.html` | 8,089 | Contact route | Production | Public route | `595a7349f70402e6` |
| `favicon.svg` | 259 | Site icon | Production | Public shared asset | `0a2be9a773ff3c89` |
| `index.html` | 30,822 | Homepage | Production | Public root route | `33b178add6dee6f8` |
| `portfolio.html` | 18,350 | Selected-work index | Production | Public route | `0dc9e6766e1e3bdd` |
| `prototypes/canvas-2d.html` | 6,844 | Canvas comparison | Experimental | Noindex; explicit visit only | `164a74c3392616e7` |
| `prototypes/index.html` | 3,401 | Prototype lab index | Experimental | Noindex; explicit visit only | `eb371642260e6d16` |
| `prototypes/svg-css.html` | 6,928 | SVG/CSS comparison | Experimental | Noindex; explicit visit only | `ff65f709d423839a` |
| `prototypes/three-js.html` | 6,781 | Three.js comparison | Experimental | Noindex; explicit visit only | `48e1bb12da7caada` |
| `robots.txt` | 75 | Crawler policy | Production | Public crawler request | `eead8ff690f1b3e3` |
| `services.html` | 13,570 | Services route | Production | Public route | `135ea61e6ae8a9ff` |
| `sitemap.xml` | 573 | Public route index | Production | Public crawler request | `954aefc742856a6e` |

Total: 30 files and 1,194,937 bytes. This is 94 bytes (+0.008%) above the Phase 7 artifact because the case study now describes the hosted demo's possible Streamlit sign-in accurately. Experimental files are intentionally present as documented technical evidence, but no production HTML preloads, links to or requests their chunks. No source map, quarantined raster, unused legacy raster, external font, Font Awesome file, local path, test report or temporary screenshot is present.
