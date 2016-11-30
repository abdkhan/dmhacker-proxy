var app = angular.module('Proxy', []);

app.controller('ProxyController', function($scope) {

    $scope.go = function () {
        var b64url = window.btoa($scope.url);
        window.location.href = '/site/' + b64url;
    };
});
