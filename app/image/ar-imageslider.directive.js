'use strict';

angular.module('arachne.directives')

    .directive('arImageslider', [function () {
        return {
            scope: {entity: '=', currentQuery: '='},
            templateUrl: 'app/image/ar-imageslider.html',
            link: function (scope, element, attrs) {

                var thumbRow = angular.element(angular.element(element.children()[0]).children()[0]).children()[2];
                var sliderRow = angular.element(element.children()[0]).children()[0];

                scope.currentImgNo = 0;
                scope.offset = 0;
                scope.max = 50;

                function teiViewerSearch(entity){
                    if(entity.externalLinks){
                        for (var i = 0; i< entity.externalLinks.length; i++){
                            if (entity.externalLinks[i].label == "TEI-Viewer")
                            return entity.externalLinks[i].url;
                        }
                    }
                    return false;
                }

                scope.imageClick = function (entity, currentImgNo, currentQuery) {
                    if (entity.externalLinks){
                        if (teiViewerSearch(entity) != false) return teiViewerSearch(entity);
                    }
                    else return "entity/" + entity.entityId + "/image/" + entity.images[currentImgNo].imageId + currentQuery.toString();
                }

                //returns the id to show the correct cursor depending on book or other objects
                scope.imageId = function (entity){
                    if (teiViewerSearch(entity)) return false;
                    else return "maximg";
                }

                scope.imageTarget = function (entity){
                    if (teiViewerSearch(entity)) return "_blank";
                    return "_self";
                }


                scope.pageThumbsLeft = function () {
                    var rowRect = sliderRow.getBoundingClientRect();
                    var offset = scope.offset - rowRect.width;
                    if (offset > 0) {
                        scope.offset = offset;
                    } else {
                        scope.offset = 0;
                    }
                };

                scope.pageThumbsRight = function () {
                    var rowRect = sliderRow.getBoundingClientRect();
                    var offset = scope.offset + rowRect.width;
                    scope.max = thumbRow.getBoundingClientRect().width - rowRect.width;
                    if (offset < scope.max) {
                        scope.offset = offset;
                    } else {
                        scope.offset = scope.max;
                    }
                };

                scope.setImage = function (imgNo) {
                    scope.currentImgNo = imgNo;
                    var rowRect = sliderRow.getBoundingClientRect();
                    var thumbEl = angular.element(thumbRow).find('img')[imgNo];
                    var thumbRect = thumbEl.getBoundingClientRect();
                    var relOffset = thumbRect.left - rowRect.left;
                    if (relOffset < 0) {
                        scope.offset += relOffset;
                    } else if (relOffset + thumbRect.width > rowRect.width) {
                        scope.offset += relOffset + thumbRect.width - rowRect.width;
                    }
                };

            }
        }
    }]);
