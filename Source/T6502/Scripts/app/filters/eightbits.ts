///<reference path="../app.ts"/>
module Filters {

    export class EightBitsFilter {
        
        public static Factory() {
            return function(input): string {
            
                var padding: string = "00000000";
                 
                if (angular.isNumber(input)) {
                    var result = padding + input.toString(2);
                    return result.substring(result.length - 8, result.length);
                }

                return input;
            }
        }
    }

    Main.App.Filters.filter("eightbits", [EightBitsFilter.Factory]);
}