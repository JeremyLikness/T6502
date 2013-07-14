///<reference path="../app.ts"/>
module Filters {

    export class HexadecimalFilter {
        
        public static Factory() {
            return function(input): string {
            
                if (angular.isNumber(input)) {
                    return "0x" + Number(input).toString(16).toUpperCase();
                }

                return input;
            }
        }
    }

    Main.App.Filters.filter("hexadecimal", [HexadecimalFilter.Factory]);
}