# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][unreleased]

## [3.0.19] - 2025-09-04

### Fixed

- Wrong initial tile set zoom level for tileLayer with custom LODs ([#1411](https://github.com/Esri/esri-leaflet/pull/1411))

## [3.0.18] - 2025-08-14

### Changed

- Reverted "fix LODmap issue" (#1400) since it caused a regression ([#1413](https://github.com/Esri/esri-leaflet/pull/1413))

## [3.0.17] - 2025-06-25

### Fixed

- Wrong initial tile set zoom level for tileLayer with custom LODs ([#1400](https://github.com/Esri/esri-leaflet/pull/1400))

## [3.0.16] - 2025-05-01

### Changed

- Changed code formatting from Semistandard to Prettier and ESLint ([#1408](https://github.com/Esri/esri-leaflet/pull/1408))

## [3.0.15] - 2025-04-07

### Fixed

- `apikey` property on TiledMapLayer ([#1407](https://github.com/Esri/esri-leaflet/pull/1407))

## [3.0.14] - 2024-12-17

### Added

- Export the Esri attribution string for other layer types to use ([#1397](https://github.com/Esri/esri-leaflet/pull/1397))

## [3.0.13] - 2024-10-25

### Fixed

- Removed usage of `toLatLngBounds` to improve usage of Esri Leaflet with ESM CDNs. ([#1394](https://github.com/Esri/esri-leaflet/pull/1394))

### Changed

- Updated dependencies ([#1382](https://github.com/Esri/esri-leaflet/pull/1382))

## [3.0.12] - 2023-11-27

### Fixed

- Added `removeEsriAttribution` to be exported ([#1379](https://github.com/Esri/esri-leaflet/pull/1379))
- Fixed issue in `TiledMapLayer` when `LOD` is `0` ([#1381](https://github.com/Esri/esri-leaflet/pull/1381))
- Fixed apostrophe URL encoding ([#1377](https://github.com/Esri/esri-leaflet/pull/1377))

## [3.0.11] - 2023-08-07

### Fixed

- Fixed issue with attribution prefix consistency ([#1366](https://github.com/Esri/esri-leaflet/pull/1366))

## [3.0.10] - 2023-01-17

### Fixed

- Fixed issue with popups when using Leaflet v1.9.3 ([#1350](https://github.com/Esri/esri-leaflet/pull/1350))

### Changed

- Updated dependencies ([#1351](https://github.com/Esri/esri-leaflet/pull/1351))

## [3.0.9] - 2022-12-09

### Fixed

- Fixed performance issue with refreshing features ([#1346](https://github.com/Esri/esri-leaflet/pull/1346))

## [3.0.8] - 2022-04-08

### Fixed

- Fixed warning in Leaflet v1.8.0 ([#1325](https://github.com/Esri/esri-leaflet/pull/1325))

### Changed

- Updated development tooling:
  - updated Semistandard ([#1319](https://github.com/Esri/esri-leaflet/pull/1319), [#1320](https://github.com/Esri/esri-leaflet/pull/1320), [#1321](https://github.com/Esri/esri-leaflet/pull/1321), [#1322](https://github.com/Esri/esri-leaflet/pull/1322))
  - switched from `watch` to `chokidar` ([#1324](https://github.com/Esri/esri-leaflet/pull/1324))
  - switched to rollup-plugin-terser ([#1316](https://github.com/Esri/esri-leaflet/pull/1316)).

## [3.0.7] - 2022-02-24

### Fixed

- Include `siteData.json` in NPM release ([#1317](https://github.com/Esri/esri-leaflet/pull/1317)).

## [3.0.6] - 2022-02-23

### Fixed

- Include `siteData.json` in NPM release (414e060d44bf2be30baaa4fe2e94021c7a1c99a1).

## [3.0.5] - 2022-02-23

### Added

- `siteInfo.json` generation as part of the release ([#1313](https://github.com/Esri/esri-leaflet/pull/1313))

### Fixed

- `FeatureLayer.refresh()` fixed for layers where `simplifyFactor` is not set ([#1304](https://github.com/Esri/esri-leaflet/pull/1304))

### Changed

- Updated dependencies ([#1314](https://github.com/Esri/esri-leaflet/pull/1314))

## [3.0.4] - 2021-12-06

### Fixed

- Feature Layer fixes: `addFeature` event fixed and `eachActiveFeature` should now respect minZoom/maxZoom ([#1301](https://github.com/Esri/esri-leaflet/pull/1301))

## [3.0.3] - 2021-09-24

### Changed

- Added a deprecation warning when using `L.esri.BasemapLayer` ([info](https://esri.github.io/esri-leaflet/api-reference/layers/basemap-layer.html)). This warning can be disabled by setting the `ignoreDeprecationWarning` option to `true`. ([#1293](https://github.com/Esri/esri-leaflet/pull/1293)).
- Updated dependencies ([#1276](https://github.com/Esri/esri-leaflet/pull/1276))

## [3.0.2] - 2021-05-24

### Fixed

- Do not use named exports from JSON ([info](https://webpack.js.org/migrate/5/#cleanup-the-code)) (🙏destus90🙏 [#1273](https://github.com/Esri/esri-leaflet/pull/1273))

## [3.0.1] - 2021-02-23

### Fixed

- Ensure that `TiledMapLayer` will complete its `onRemove` prototype logic after removing its attribution. ([#1256](https://github.com/Esri/esri-leaflet/issues/1256))

## [3.0.0] - 2021-01-25

### Added

- `apikey` method on L.esri.Task
- `apikey` property on L.esri.FeatureLayer

## [2.5.3] - 2021-01-06

### Fixed

- Fix error (introduced in v2.5.2) that happens when the map attribution control is not present (🙏avinmathew🙏 [#1252](https://github.com/Esri/esri-leaflet/pull/1252))

### Changed

- REST calls will now use `inSR` instead of `inSr` ([#1251](https://github.com/Esri/esri-leaflet/pull/1251))

## [2.5.2] - 2020-12-29

### Fixed

- When esri-leaflet layers are removed from the map, the attribution will be removed ([#1248](https://github.com/Esri/esri-leaflet/pull/1248))

## [2.5.1] - 2020-10-04

### Added

- Support 'withCredentials' option (🙏luiscamachopt🙏 [#1233](https://github.com/Esri/esri-leaflet/pull/1233))
- Support 'fetchAllFeatures' option (🙏francharbo🙏 [#1229](https://github.com/Esri/esri-leaflet/pull/1229))

## [2.5.0] - 2020-08-06

### Fixed

- Fix Error on cellEnter (🙏francharbo🙏 [#1204](https://github.com/Esri/esri-leaflet/pull/1204))
- Fix bugs with feature layer setWhere ([#1211](https://github.com/Esri/esri-leaflet/pull/1211))
- MinZoom issue - do not clear \_currentSnapshot when hiding the layer ([#1212](https://github.com/Esri/esri-leaflet/pull/1212))
- ImageMapLayer - proxy support now works when `f:image` ([#1221](https://github.com/Esri/esri-leaflet/pull/1221))
- DynamicMapLayer - proxy support now works when `f:image` ([#1220](https://github.com/Esri/esri-leaflet/pull/1220))
- FeatureLayer issues when `refresh()` was called ([#1224](https://github.com/Esri/esri-leaflet/pull/1224))
- Issues when `addFeatures()` (or `updateFeatures()`) then `setWhere()` was called ([#1226](https://github.com/Esri/esri-leaflet/pull/1226))

### Changed

- `DynamicMapLayer` now defaults to using `format: 'png32'` instead of `'png24'`. (🙏pmacMaps🙏 [#1202](https://github.com/Esri/esri-leaflet/pull/1202), [#1187](https://github.com/Esri/esri-leaflet/issues/1187))
- Reverted the functionality that allowed over-zooming with the Imagery basemap in certain areas of the world due to bugs that were caused by that change ([#1223](https://github.com/Esri/esri-leaflet/pull/1223))

## [2.4.1] - 2020-05-19

### Fixed

- Fixed ES5 issue ([#1201](https://github.com/Esri/esri-leaflet/pull/1201))

## [2.4.0] - 2020-04-22

### Fixed

- Updated `request` to be imported in `BasemapLayer.js` rather than relying on global `L.esri`. (🙏danieloliveira117🙏 [#1191](https://github.com/Esri/esri-leaflet/issues/1191))

### Changed

- Updated `FeatureLayer` allowing queries to be consistently cached both on the server and on ArcGIS Online CDN. This should result in a decent performance boost for most use cases and in some cases (public, non-editable data) a significant performance boost. [#1189](https://github.com/Esri/esri-leaflet/pull/1189).
- use `@terraformer/arcgis` (instead of `@esri/arcgis-to-geojson-utils`) to generate GeoJSON from older ArcGIS services [#1194](https://github.com/Esri/esri-leaflet/pull/1194).

## [2.3.3] - 2020-01-29

### Fixed

- Ensure `DynamicMapLayer` can use both a token and `f: 'image'`. ([#1180](https://github.com/Esri/esri-leaflet/issues/1180))

## [2.3.2] - 2019-11-13

### Fixed

- Time filtering fix which adds a case for when a feature's time range contains the time range given in the to and from options for the layer. (🙏pjbiogit🙏 [#1174](https://github.com/Esri/esri-leaflet/pull/1174))

## [2.3.1] - 2019-10-10

### Fixed

- `?undefined` issue when using DynamicMapLayer and Proxy ([#1164](https://github.com/Esri/esri-leaflet/pull/1164))

### Changed

- REST calls will now use `outSR` instead of `outSr` ([#1168](https://github.com/Esri/esri-leaflet/pull/1168))

## [2.3.0] - 2019-07-17

### Fixed

- Time filtering fix (🙏pjbiogit🙏 [#1156](https://github.com/Esri/esri-leaflet/issues/1156))

### Changed

- dynamically resample Esri World Imagery (🙏jgravois🙏 [#1011](https://github.com/Esri/esri-leaflet/pull/1011))
- 'loading' event fired immediately before /export is called (🙏ogix🙏 [#1146](https://github.com/Esri/esri-leaflet/issues/1146))
- warning if `setTimeRange()` is called without a `timeField` ([#1148](https://github.com/Esri/esri-leaflet/issues/1148))

## [2.2.4] - 2019-03-20

### Fixed

- ensure a CORS request is made to fetch dynamic attribution for Esri basemaps instead of a JSONP request. (🙏jubasse🙏 [#1142](https://github.com/Esri/esri-leaflet/issues/1142))
- make sure webpack clients can access the ES source. ([#1134](https://github.com/Esri/esri-leaflet/issues/1134))
- ensure `basemapLayer` honors a proxy if one is set. (🙏dangowans🙏 [#1122](https://github.com/Esri/esri-leaflet/pull/1122))
- resolve devDependency security vulnerabilities (🙏gavinr🙏 [#1126](https://github.com/Esri/esri-leaflet/pull/1126))

## [2.2.3] - 2018-08-16

### Fixed

- ensure `ImageMapLayer` leverages a proxy. (🙏dangowans🙏 [#1121](https://github.com/Esri/esri-leaflet/pull/1121))

## [2.2.2] - 2018-08-02

### Fixed

- trapped an error when Map.attribution control is _not_ loaded.

### Added

- `dynamicMapLayer()` and `imageMapLayer()` now both expose a new `zIndex` constructor option and modify `zIndex` values appropriately internally when `bringToFront()` and `bringToBack()` are called. (🙏appleshowc🙏 [#1084](https://github.com/Esri/esri-leaflet/pull/1084))

## [2.2.1] - 2018-07-11

### Fixed

- resolved issue that caused _some_ raw ES6 files to not be bundled on npm.

## [2.2.0] - 2018-07-08

### Added

- it is now possible to add/update features in feature services in bulk (🙏Biboba🙏 [#1083](https://github.com/Esri/esri-leaflet/pull/1083))
- two new basemaps! `ImageryFirefly` and `Physical` (🙏pmacMaps🙏 [#1100](https://github.com/Esri/esri-leaflet/pull/1100))

### Changed

- use external sourcemap files consistently, even for debug build [#1088](https://github.com/Esri/esri-leaflet/pull/1088)

### Fixed

- better error trapping for non CORS requests (🙏strajuser🙏 [#1070](https://github.com/Esri/esri-leaflet/pull/1070))
- trap for GeoJSON with null geometry [#1060](https://github.com/Esri/esri-leaflet/issues/1060)
- check for null attribution (🙏octavm🙏 [#1078](https://github.com/Esri/esri-leaflet/pull/1078))
- ensure `token` is only included in tile requests once (🙏octavm🙏 [#1092](https://github.com/Esri/esri-leaflet/pull/1092))
- addressed <https://nodesecurity.io/advisories/566> [#1094](https://github.com/Esri/esri-leaflet/pull/1094)

### Removed

- cruft from npm tarball [#1067](https://github.com/Esri/esri-leaflet/pull/1067)

## [2.1.4] - 2018-03-09

### Changed

- upgraded to Rollup `v0.56.5`
- upgraded to @esri/arcgis-to-geojson-utils `v1.1.1`

### Fixed

- ensure tiledMapLayers utilize a configured proxy (🙏spoilsportmotors🙏 [#1053](https://github.com/Esri/esri-leaflet/pull/1053))

- fix logic error and simplify check for supported non-web mercator CRSs [#1051](https://github.com/Esri/esri-leaflet/pull/1051)

## [2.1.3] - 2018-02-14

### Added

- new `ImageryClarity` basemapLayer (🙏Biboba🙏 [#1047](https://github.com/Esri/esri-leaflet/pull/1047))
- dynamic attribution for `WorldImagery` basemap layer to attribute local Community Maps content providers

### Fixed

- smarter check for custom coordinate systems [#1045](https://github.com/Esri/esri-leaflet/pull/1045))
- removed rogue `Proj4` console errors in webpack/browserify apps
- caught the last few non ES6 imports from Leaflet (🙏finneganh🙏 [#1050](https://github.com/Esri/esri-leaflet/pull/1050))

## [2.1.2] - 2018-01-04

### Fixed

- improved support for custom `wkid:3857` tiled basemaps with custom properties [#1039](https://github.com/Esri/esri-leaflet/pull/1039))
- `image` is now the default format for ImageMapLayer (🙏nickpeihl🙏 [#998](https://github.com/Esri/esri-leaflet/pull/998))
- improved response parsing when no objectIdFieldName or esriFieldTypeOID are returned (🙏Saulzi🙏 [#1009](https://github.com/Esri/esri-leaflet/pull/1009))
- improved cleanup when map instances are destroyed (🙏jfolds🙏 [#1029](https://github.com/Esri/esri-leaflet/pull/1029))

### Added

- It is now possible for layers to pass through arbitrary custom request parameters (🙏Biboba🙏 [#1036](https://github.com/Esri/esri-leaflet/pull/1036))
- `QueryTask.returnM(bool)` (🙏jmfolds🙏 [#1002](https://github.com/Esri/esri-leaflet/pull/1002))
- `QueryTask.distinct()` (🙏joelondon🙏 [#1027](https://github.com/Esri/esri-leaflet/pull/1027))
- `DynamicMapLayer` has a new `popup` constructor option so that custom IdentifyFeatures parameters can be passed through (🙏Biboba🙏 [#1031](https://github.com/Esri/esri-leaflet/pull/1031))
- more tests for existing features! (🙏Biboba🙏 #1037, #1035)

### Removed

- unused `shallowClone` utility method

## [2.1.1] - 2017-08-11

### Fixed

- made Leaflet a peerDependency so that folks using WebPack can install v1.1.x without problems or duplication in their bundles
- added `UTF 8` to L.esri.request headers

### Changed

- now using `npm-run-all` for concurrent, cross platform script running

## [2.1.0] - 2017-07-27

### Added

- error handling has been added to classes that extend L.ImageOverlay [#941](https://github.com/Esri/esri-leaflet/pull/941) thank you[@Saulzi](https://github.com/Saulzi)!
- dynamicMapLayer now supports an option to bust server side caches [#942](https://github.com/Esri/esri-leaflet/issues/942)
- identifyFeatures and find now support requesting unformatted responses from ArcGIS Server 10.5+ map services [#961](https://github.com/Esri/esri-leaflet/issues/961)
- identifyFeatures now supports passing through input geometries other than points [#962](https://github.com/Esri/esri-leaflet/pull/962) thank you[@bbehling](https://github.com/bbehling)!
- dynamicMapLayer and imageMapLayer now support polar projections [#975](https://github.com/Esri/esri-leaflet/pull/975) thank you[@scaddenp](https://github.com/scaddenp)!
- query now supports datum transformations [#976](https://github.com/Esri/esri-leaflet/pull/976)

### Fixed

- in imageMapLayer, noData values of `0` are now handled correctly [#946](https://github.com/Esri/esri-leaflet/issues/946)
- ensure that eachActiveFeature correctly handles all geometry types [#948](https://github.com/Esri/esri-leaflet/issues/948)
- layer definitions are now passed through when binding a popup to dynamicMapLayer [#957](https://github.com/Esri/esri-leaflet/issues/957)
- ensure definition queries are applied to invisible layers [#964](https://github.com/Esri/esri-leaflet/pull/964) thank you[@jordanparfitt](https://github.com/jordanparfitt)!

## [2.0.8] - 2017-02-28

### Changed

- dynamicMapLayer popups now retrieve generalized geometries from map services to improve performance. [#921](https://github.com/Esri/esri-leaflet/pull/921)
- queries for features are no longer fired outside the layer's artificially constrained zoom level [#928](https://github.com/Esri/esri-leaflet/pull/928) (thank you[@keithpower](https://github.com/keithpower)!)
- ES6 syntax is now used to import selected Leaflet dependencies. [#920](https://github.com/Esri/esri-leaflet/pull/920)

### Fixed

- errors are no longer encountered when panning the map outside the artificially constrained zoom level of a previously drawn dynamicMapLayer [#917](https://github.com/Esri/esri-leaflet/pull/917) (thank you[@jordanparfitt](https://github.com/jordanparfitt)!)
- the value range returned by `IdentifyFeatures.simplify()` has been reversed for consistency with `Query.simplify()` [#921](https://github.com/Esri/esri-leaflet/pull/921)
- features are no longer accidentally drawn when the map is panned to a new location outside the artificially constrained zoom level of the layer. [#924](https://github.com/Esri/esri-leaflet/pull/924) (thank you[@keithpower](https://github.com/keithpower)!)

### Added

- In situations where a feature layer supports the geojson format, but it is deemed preferable to ask for Esri Geoservices JSON instead, developers can now set `isModern: false` as a constructor option. [#935](https://github.com/Esri/esri-leaflet/pull/935) (thank you[@spoilsportmotors](https://github.com/spoilsportmotors)!)
- an `eachActiveFeature()` method has been added to `Layers.FeatureLayer` in order to isolate features in the cache that are currently being displayed. [#936](https://github.com/Esri/esri-leaflet/pull/936)
- `Tasks.Query` now has two new spatial operators. `bboxIntersects` and `indexIntersects`. [#937](https://github.com/Esri/esri-leaflet/pull/937)

## [2.0.7] - 2017-01-10

### Fixed

- its now possible to call setOpacity() immediately after instantiating a `RasterLayer` [#909](https://github.com/Esri/esri-leaflet/pull/909) (thank you[@Saulzi](https://github.com/Saulzi)!)
- `L.TileLayer` maxNativeZoom is now honored by `tiledMapLayer` [#904](https://github.com/Esri/esri-leaflet/pull/904)
- an error is no longer thrown when a `RasterLayer` is added to the map at a zoom level outside its own custom restraint [#903](https://github.com/Esri/esri-leaflet/pull/903)
- `addfeature` is no longer emitted twice when `FeatureLayer.setWhere()` is called [#893](https://github.com/Esri/esri-leaflet/pull/893)

### Changed

- `RasterLayer` now exposes a public `redraw()` method [#905](https://github.com/Esri/esri-leaflet/pull/905)
- an inline base64 encoded transparent image is now substituted for missing tiles [#902](https://github.com/Esri/esri-leaflet/pull/902)
- the `addfeature` event is no longer triggered when features are fetched and drawn for the very first time [#893](https://github.com/Esri/esri-leaflet/pull/893)

## [2.0.6] - 2016-11-16

### Fixed

- `withCredentials` is no longer set for CORS requests [#890](https://github.com/Esri/esri-leaflet/pull/890)

## [2.0.5] - deprecated

### Fixed

- DynamicMapLayer image overlays now utilize a proxy when appropriate [#862](https://github.com/Esri/esri-leaflet/issues/862)
- `DynamicMapLayer.layerDefs` provided as a string are now serialized correctly [#866](https://github.com/Esri/esri-leaflet/pull/866) (thank you[@whyvez](https://github.com/whyvez)!)
- We no longer ask for raw geojson from ArcGIS Online proxied services that can't provide it. [#876](https://github.com/Esri/esri-leaflet/issues/876)
- Copyright text for `TiledMapLayer` is now displayed automatically when the map has a custom projection. [#877](https://github.com/Esri/esri-leaflet/issues/877)
- When a null extent is encountered by L.esri.Query, no matter its form, an `Invalid Bounds` error is passed in the callback. [#879](https://github.com/Esri/esri-leaflet/issues/879)
- `L.esri.request` now sets the generic `withCredentials` header when appropriate [#881](https://github.com/Esri/esri-leaflet/issues/881)

## [2.0.4] - 2016-10-18

### Changed

- The default maximum width of Leaflet's attribution control is now `55px` less than the map itself [#842](https://github.com/Esri/esri-leaflet/pull/842)

### Added

- A custom width crop can be configured via `L.esri.options.attributionWidthOffset` [#849](https://github.com/Esri/esri-leaflet/pull/849)
- `L.esri.query` now supports GeoJSON MultiPolygons [#866](https://github.com/Esri/esri-leaflet/pull/866) (thank you[@whyvez](https://github.com/whyvez)!)

### Fixed

- Last references to global namespaces have been removed from `L.esri.Util` [#852](https://github.com/Esri/esri-leaflet/pull/852) (thank you[@hamhands](https://github.com/hamhands)!)
- started linting our test suite
- `responseToFeatureCollection` now uses a case insensitive regex to look for common indexing field names
- `GeoJSON` / `geoJSON` casing is now used consistently

## [2.0.3] - 2016-09-16

### Added

- attribution from service metadata is now automatically displayed in Leaflet's attribution control for all layer types [#832](https://github.com/Esri/esri-leaflet/pull/832), [#842](https://github.com/Esri/esri-leaflet/pull/842) (thank you[@tyleralves](https://github.com/tyleralves)!)
- `Powered by Esri` is now displayed in Leaflet's attribution control when _any_ layer type is added to the map, not just L.esri.basemapLayer.
- the attribution control is restricted to a single line, but expands to show all data contributors on mouse hover.
- support for `DynamicMapLayer` services that require a token to be passed in a request for raw images [#830](https://github.com/Esri/esri-leaflet/pull/830) (thank you[@jaredbrookswhite](https://github.com/jaredbrookswhite)!)

## [2.0.2] - 2016-08-03

### Added

- support for `ImageMapLayer` services that require a token to be passed in a request for raw images [#812](https://github.com/Esri/esri-leaflet/pull/812)
- more graceful handling of stubborn `TiledMapLayer` services [#810](https://github.com/Esri/esri-leaflet/pull/810)

### Fixed

- bug which resulted in global `map` scope creep [#814](https://github.com/Esri/esri-leaflet/issues/818)
- bug which caused distortion in featureLayer display [#814](https://github.com/Esri/esri-leaflet/issues/818)

### Changed

- Attribution text which is displayed for hosted Esri basemaps is now 'Powered by [Esri](https://www.esri.com)'

## [2.0.1] - 2016-07-16

### Added

- users can now pass tokens to `basemapLayer` [#800](https://github.com/Esri/esri-leaflet/pull/800)

### Fixed

- to avoid broken tile thumbnails, a generic blank tile is referenced automatically by `tiledMapLayer`. [#784](https://github.com/Esri/esri-leaflet/pull/784)
- ensure addfeature and removefeature events are emitted when `featureLayer`s are added to and removed from the map. [#788](https://github.com/Esri/esri-leaflet/pull/788)
- base64 `dynamicMapLayer` responses are now parsed appropriately [#796](https://github.com/Esri/esri-leaflet/pull/796)

### Changed

- the esri logo is no longer displayed when hosted basemaps are used. It has been replaced by '&copy; Esri' in the map attribution. [#783](https://github.com/Esri/esri-leaflet/pull/783)
- Internal methods used to display dynamic attribution for tiled services with supporting static services were moved into L.esri.Util. [#799](https://github.com/Esri/esri-leaflet/pull/799)

## [1.0.4] - 2016-07-03

### Fixed

- ensure we remove all Esri logos from the map #795
- ensure addfeature and removefeature events are emitted when L.esri.featureLayers are added to and removed from the map. #788

## [2.0.0] - 2016-05-04

### Added

- new 'USATopo' `L.esri.basemapLayer` option.
- boilerplate issue template

### Fixed

- Worked around IE10,11 bug that caused `L.esri.featureLayer`s not to draw <https://github.com/Esri/esri-leaflet/pull/770>
- Ensured `L.esri.imageMapLayer` are overlaid appropriately at world scale <https://github.com/Esri/esri-leaflet/pull/774>
- Ensured copyright text makes it into the minified, concatenated build of the library
- create script tag after JSONP callback function is defined <https://github.com/Esri/esri-leaflet/issues/762>

## [2.0.0-beta.8]

### Changed

- Build system refactored to use latest Rollup and Rollup plugins.
- Reworked bundling directives for various modules systems to resolve and simplify various issues
  - WebPack users no longer have to use the Babel loader.
  - Babelify with Babel 6 now works

### Added

- `timeout` parameter for `FeatureLayer` <https://github.com/Esri/esri-leaflet/pull/730> Thanks @nathanhilbert

## [1.0.3]

### Fixed

- Ensure all visual relics of `L.esri.dynamicMapLayer` are removed outside `mi