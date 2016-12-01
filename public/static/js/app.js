var app = angular.module('Proxy', []);

app.controller('ProxyController', function($scope, $http) {

    $http({
        method: 'GET',
        url: '/ip'
    }).then(function(response) {
        $scope.title = response.data.ip;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }, function(err) {
        Materialize.toast('Unable to get server ip', 3000);
        $scope.title = 'Bush did 7/11.';
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    });

    $scope.go = function() {
        window.location.href = '/site/' + $scope.url;
    };
});
