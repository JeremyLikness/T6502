///<reference path="../app.ts"/>
///<reference path="../services/consoleService.ts"/>

module Directives {

    export interface IConsoleScope extends ng.IScope {
        lines: string[];
    }

    export class Console {

        public static Factory(
            consoleService: Services.IConsoleService) {
            return {
                restrict: "E",
                template:
                    "<div class='console'><span ng-repeat='line in lines'>{{line}}<br/></span></div>",
                scope: {},
                link: function (scope: IConsoleScope, element) {
                    var e: JQuery = angular.element(element);
                    scope.lines = consoleService.lines;
                    scope.$watch("lines", () => {
                        var div: HTMLDivElement = <HTMLDivElement>$(e).get(0).childNodes[0];
                        $(div).scrollTop(div.scrollHeight); 
                    }, true);                    
                }
            };
        }
    }

    Main.App.Directives.directive("console", ["consoleService", Console.Factory]);
}
