'use strict';

angular.module('arachne.services')

/**
 * contact Form
 */
.factory('contactService', ['arachneSettings', '$resource',
function(arachneSettings, $resource) {
    var contactService = $resource('', {}, {
        sendContact : {
            url: arachneSettings.dataserviceUri + '/contact',
            isArray: false,
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        }
    });
    return {
        sendContact : function(contact, successMethod, errorMethod){
            return contactService.sendContact(contact, successMethod, errorMethod);
        }
    }
}]);