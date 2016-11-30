var app = angular.module('Proxy', []);

app.controller('ProxyController', function($scope, $http) {

    $scope.title = 'Bush did 7/11.';
    $http({
        method: 'GET',
        url: '/ip'
    }).then(function (response) {
        $scope.title = response.ip;
        $scope.$digest();
    }, function (err) {
        Materialize.toast('Unable to get server ip', 3000);
        $scope.$digest();
    });

    $scope.go = function () {
        var b64url = window.btoa($scope.url);
        window.location.href = '/site/' + b64url;
    };
});
