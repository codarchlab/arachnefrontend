'use strict';

angular.module('arachne.widgets.map')

/**
 * @author: David Neugebauer
 */
.directive('con10tMapMenuSearchField', ['$location', 'searchService', 'mapService', '$window',
function($location, searchService, mapService, $window) {
return {
    restrict: 'A',
    scope: {
        heading: '@'
    },
    templateUrl: 'app/map/con10t-map-menu-search-field.html',
    link: function(scope) {

        var route = $location.path().slice(1);
        var currentQuery = searchService.currentQuery();

        searchService.getCurrentPage().then(function() {
            scope.q = currentQuery.q;
            if (scope.q === '*') scope.q = '';
        });

        scope.search = function(q) {
            if (q === '') q = '*';

            // remove coordinate and zoom params on new search to indicate that the map
            // should choose its default action when rendering the new objects' places
            var query = mapService.getMapQuery(searchService.currentQuery(),true).setParam('q',q);

            var path = '/' + route + query.toString();
            $window.location.href = path;

        };
    }
}
}]);