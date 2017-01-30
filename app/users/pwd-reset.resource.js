'use strict';

angular.module('arachne.resources')

.factory('PwdReset', ['$resource', 'arachneSettings',
function($resource, arachneSettings) {

    return $resource(arachneSettings.dataserviceUri + '/user/reset', {}, {
        save : {
            isArray: false,
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        }
    });
}]);