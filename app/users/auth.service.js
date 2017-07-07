'use strict';

angular.module('arachne.services')

// singleton service for authentication, stores credentials in browser cookie
// if cookie is present the stored credentials get sent with every backend request
.factory('authService', ['$http', '$sce', 'arachneSettings', '$filter', '$cookieStore',
function($http, $sce, arachneSettings, $filter, $cookieStore) {

    // initialize to whatever is in the cookie, if anything
    if ($cookieStore.get('ar-authdata')) {
        $http.defaults.headers.common['Authorization'] = 'Basic ' + $cookieStore.get('ar-authdata');
    } else {
        delete $http.defaults.headers.common['Authorization'];
    }

    return {

        setCredentials: function (username, password, successMethod, errorMethod) {
            var encoded = $filter('base64')(username + ':' + $filter('md5')(password)), response;

            $http.get(arachneSettings.dataserviceUri + '/userinfo/'+username, { headers: { 'Authorization': 'Basic ' + encoded } })
                .then(function(result) {

                    response = result.data;

                    $http.defaults.headers.common.Authorization = 'Basic ' + encoded;
                    $cookieStore.put('ar-authdata', encoded);
                    $cookieStore.put('ar-user', { username: username, groupID: response.groupID });

                    if (response.datasetGroups !== undefined) {
                        $cookieStore.put('ar-datasetgroups', response.datasetGroups);
                    }

                    successMethod();
                }).error(function(response) {
                    errorMethod(response);
                });
        },

        clearCredentials: function () {
            document.execCommand("ClearAuthenticationCache");
            $cookieStore.remove('ar-authdata');
            $cookieStore.remove('ar-user');
            $cookieStore.remove('ar-datasetgroups');
            delete $http.defaults.headers.common['Authorization'];
        },

        getUser: function() {
            return $cookieStore.get('ar-user');
        },

        getDatasetGroups: function() {
            return $cookieStore.get('ar-datasetgroups') || [];
        }

    };
}]);