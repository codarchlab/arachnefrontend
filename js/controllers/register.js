'use strict';

angular.module('arachne.controllers')

/**
 * Register Form Controller.
 * @see partials/register.html.
 */
.controller('RegisterController', [ '$scope', '$http', '$filter', 'message', 'arachneSettings',
function ( $scope, $http, $filter, message, arachneSettings) {

    /**
     * Sends the account registration request to the backend
     * and reports if it was successful. If it was not successful,
     * the callback will get a message with an explanation.
     *
     * @param user the user object.
     * @return callback(isSuccess:boolean,message:string)
     */
    var register= function(user,callback){

        // The original user object will be copied so the original does not get modified.
        // The copy get send to the backend and will contain the md5 encrypted pwd. If that would
        // modify the reference which is bound to the scope
        // and the request would be rejected, the md5 passes would enter
        // the form and upon a successful request it would be encrypted again and as a result
        // unusable as it would be different from what the user entered.
        var newUser= JSON.parse(JSON.stringify(user))

        if (user.password)
            newUser.password = $filter('md5')(user.password);
        if (user.passwordValidation)
            newUser.passwordValidation = $filter('md5')(user.passwordValidation);

        $http.post(arachneSettings.dataserviceUri + "/user/register", newUser, {
            "headers": { "Content-Type": "application/json" }

        }).success(function(data) {
            return callback(true,null);
        }).error(function(data) {
            return callback(false,data.message);
        });
    };


    $scope.submit = function() {
        register($scope.user,
            function(isSuccess,msg){
            if(isSuccess)
                message.addMessageForCode('register_success', 'success');
            else
                message.addMessageForCode(msg, 'danger');
        });
    };
}]);