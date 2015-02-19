'use strict';

/* Directives */

angular.module('heists.directives', [])
  .directive('myAdSense', function() {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      template: '<div ng-transclude></div>',
      link: function ($scope, element, attrs) {}
    }
  });
