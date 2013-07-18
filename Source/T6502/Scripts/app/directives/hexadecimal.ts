///<reference path="../app.ts"/>

module Directives {

    export class Hexadecimal {

        public static Factory() {
            return {
                restrict: "A",
                require: 'ngModel',
                link: function (scope: ng.IScope, element, attrs, ctrl: ng.INgModelController) {
                
                    ctrl.$parsers.push(function(value) {
                        var address: number = parseInt(value, 16);
                        var isValid: boolean = !isNaN(address) && address >= 0 && address < Constants.Memory.Size;
                        ctrl.$setValidity('hexadecimal', isValid);
                        return isValid ? value : undefined;                                               
                    });                                                           
                }                                    
            };
        }
    }

    Main.App.Directives.directive("hexadecimal", [Hexadecimal.Factory]);
}
