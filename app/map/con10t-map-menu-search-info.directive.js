'use strict';

angular.module('arachne.widgets.map')

/**
 * @author: David Neugebauer
 * @author: Daniel M. de Oliveira
 */
    .directive('con10tMapMenuSearchInfo', ['$uibModal', '$location', 'searchService', 'placesService', 'mapService', 'searchScope',
        function ($uibModal, $location, searchService, placesService, mapService, searchScope) {
            return {
                restrict: 'A',
                scope: {
                    // "grid" or "places", depending on the map's type, different
                    // search results are required
                    type: '@'
                },
                templateUrl: 'app/map/con10t-map-menu-search-info.html',
                link: function (scope) {

                    scope.searchScope = searchScope.getSe
                    scope.currentQuery = searchService.currentQuery();
                    scope.getScopePath = searchScope.currentScopePath;

                    // renders a modal that contains a link to the current map's view
                    scope.showLinkModal = function () {
                        // construct the link's reference from the current location and the map's query
                        var host = $location.host();
                        var port = $location.port();
                        port = (port === 80) ? "" : ":" + port;
                        var baseLinkRef = document.getElementById('baseLink').getAttribute("href");
                        var path = $location.path().substring(1);

                        var query;
                        if (scope.que)
                            query = scope.que;
                        else
                            query = mapService.getMapQuery(searchService.currentQuery()).toString();

                        scope.linkText = host + port + baseLinkRef + path + query;

                        var modalInstance = $uibModal.open({
                            templateUrl: 'app/map/map-link-modal.html',
                            scope: scope
                        });

                        modalInstance.close = function () {
                            modalInstance.dismiss();
                        };

                        // Select and focus the link after the modal rendered
                        modalInstance.rendered.then(function (what) {
                            var elem = document.getElementById('link-display');
                            elem.setSelectionRange(0, elem.firstChild.length);
                            elem.focus();
                        })
                    };

                    function placesCount(entities) {
                        if (mapService.underLimit()) {
                            // var placesCount =
                            return placesService.makePlacesFromEntities(entities, searchService.currentQuery().bbox.split(",")).length;
                        } else
                            return undefined;
                    }

                    var queryListener = function (entities) {
                        // basic information about the search depends on the type of the map
                        // (either a geogrid or a map with Place objects)
                        scope.placesCount = placesCount(entities);
                        scope.entityCount = searchService.getSize();

                        // scope.que=mapService.getMapQuery(searchService.currentQuery()).toString();
                        // scope.entityCount = searchService.getSize();
                    };

                    searchService.getCurrentPage().then(function (entities) {
                        scope.entitiesTotal = searchService.getSize();
                        scope.entityCount = searchService.getSize();
                        scope.placesCount = placesCount(entities);
                        mapService.registerOnMoveListener(queryListener);
                    });
                }
            }
        }]);