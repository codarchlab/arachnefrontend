'use strict';

angular.module('arachne.widgets.map')

/**
 * Shows a heatmap constructed from the current searches
 * agg_geogrid facet. If the resources of the viewport fall below
 * a certain threshold, the map will show markers instead.
 *
 * @author Daniel de Oliveira
 * @author David Neugebauer
 */
    .directive('con10tMap', ['$filter', 'searchService', 'mapService', 'heatmapPainter', 'placesService', 'placesPainter',
        function ($filter, searchService, mapService, heatmapPainter, placesService, placesPainter) {

            function enrichQuery(currentQuery, scope) {

                if (!currentQuery.q) currentQuery.q = '*';

                if (!currentQuery.lat)
                    if (scope.lat) currentQuery.lat = scope.lat;
                if (!currentQuery.lng)
                    if (scope.lng) currentQuery.lng = scope.lng;
                if (!currentQuery.zoom)
                    if (scope.zoom) currentQuery.zoom = scope.zoom;
                // Add a limit to the search if defined in the attribute
                if (scope.limit) {
                    currentQuery.limit = scope.limit;
                }

                // Add restrictions for facets to the search if defined
                if (scope.facetsSelect) {

                    var facet, len = scope.facetsSelect.length;

                    for (var i = 0; i < len; i++) {

                        facet = scope.facetsSelect[i];

                        if (!currentQuery.hasFacet(facet.key)) {
                            currentQuery.facets.push(facet);
                        }
                    }
                }

                // Add a further restriction for the catalog id
                if (scope.catalogId) {
                    if (angular.isArray(scope.catalogId)) {
                        var nbrOfIds = scope.catalogId.length;
                        for (var j = 0; j < nbrOfIds; j++) {
                            currentQuery.facets.push({key: 'catalogIds', value: scope.catalogId[j]});
                        }
                    } else {
                        currentQuery.facets.push({key: 'catalogIds', value: scope.catalogId});
                    }
                }
            }

            /**
             * Set the map's view:
             * fit bounds to entities only when zoom or coordinates are not explicitly
             * required by the url, else use the url settings
             */
            function fitViewToMarkers(zoom, lat, lng, places) {

                if ((places && places.length > 0) && !(zoom || lat || lng)) {

                    var latLngs = places.map(function (place) {
                        if (place.location) {
                            return [place.location.lat, place.location.lon];
                        }
                    });

                    // Sets zoom, such that it is not too detailed when few entities are shown.
                    // Zooms out a little bit to prevent all markers being hidden behind menus on the side.
                    if (mapService.getMap().getZoom() > 9) {
                        mapService.getMap().fitBounds(latLngs).setZoom(9);
                    } else if (mapService.getMap().getZoom() > 4) {
                        mapService.getMap().fitBounds(latLngs).setZoom(mapService.getMap().getZoom() - 1);
                    } else
                        mapService.getMap().fitBounds(latLngs);
                }
            }

            return {
                restrict: 'A',
                scope: {
                    catalogId: '=',
                    baselayers: '=',
                    defaultBaselayer: '=',	// "key"
                    limit: '@?',		    // "500"
                    facetsSelect: '=',		// {facetName: facetValue, ...}
                    lat: '@',
                    lng: '@',
                    zoom: '@',
                    entityCallback: '=',
                    pinList: '=',
                    minZoom: '='
                },
                link: function (scope, element) {

                    if (scope.limit === undefined || scope.limit > 1000) scope.limit = 1000;

                    var fitViewToMarkersAllowed = true;

                    var cq = searchService.currentQuery();
                    enrichQuery(cq, scope);   // manually set stuff

                    var lastBbox;

                    function mapOnMove(entities) {
                        // prevent reissueing search if bbox has not changed
                        if (lastBbox === cq.bbox) {
                            return;
                        } else {
                            lastBbox = cq.bbox;
                        }

                        if (mapService.underLimit()) {

                            placesPainter.clear(); // TODO implement map.removeLayers

                            heatmapPainter.clear();

                            var places = placesService.makePlacesFromEntities(entities, cq.bbox.split(","));

                            placesPainter.drawPlaces(places, scope);

                            if (fitViewToMarkersAllowed) {
                                fitViewToMarkers(
                                    cq.zoom, cq.lat, cq.lng,
                                    places
                                );
                            }
                        }
                        else {
                            placesPainter.clear();
                            heatmapPainter.clear();

                            var bucketsToDraw = null;
                            var agg_geogrid = searchService.getFacet("agg_geogrid");
                            if (agg_geogrid) bucketsToDraw = agg_geogrid.values;
                            heatmapPainter.drawBuckets(cq.bbox, bucketsToDraw);
                        }

                        fitViewToMarkersAllowed = false;
                    }


                    mapService.setLimit(scope.limit);
                    mapService.registerOnMoveListener(mapOnMove);

                    mapService.initializeMap(
                        element.attr('id'),
                        {
                            minZoom: scope.minZoom || 3
                        } // 3 is to prevent wrong bbox searches
                        // when the window is bigger than the world,
                    );
                    heatmapPainter.setMap(mapService.getMap());

                    placesPainter.setMap(mapService.getMap());
                    placesPainter.setEntityCallback(scope.entityCallback);
                    placesPainter.setFixedPlaces(scope.pinList);

                    // Add baselayers and activate one, given by url
                    // parameter "baselayer" or a default value
                    mapService.setBaselayers(scope.baselayers);
                    mapService.activateBaselayer(cq.baselayer || "osm");

                    var bb = placesPainter.getFixedPlacesBoundingBox();
                    if (bb) {
                        mapService.initializeViewBB(bb);
                    } else {
                        mapService.initializeView(cq.lat, cq.lng, cq.zoom);
                    }

                }
            }
        }
    ]);