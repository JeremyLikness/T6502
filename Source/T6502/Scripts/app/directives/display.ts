///<reference path="../app.ts"/>
///<reference path="../services/consoleService.ts"/>
///<reference path="../services/displayService.ts"/>
///<reference path="palette.ts"/>

module Directives {

    export class Display {

        private static MakeSvg(tag: string, attrs: any): any {
            var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
            for (var attr in attrs) {
                el.setAttribute(attr, attrs[attr]);
            }
            return el;
        }

        public static Factory(
            consoleService: Services.ConsoleService,
            displayService: Services.DisplayService) {

            var pixelBuffer: number[];
            var displayBuffer: any[];
            var palette: string[];

            return {
                restrict: "E",
                template:
                    "<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\">" +
                    "<rect x=\"0\" y=\"0\" width=\"" + Constants.Display.CanvasXMax +"\" height=\"" 
                    + Constants.Display.CanvasYMax + "\"" +
                    " style=\"fill:white;\"/></svg>",
                scope: {},
                link: function (scope: ng.IScope, element, attrs) {
                    
                    var element: any = angular.element(element);
                    var x: number, xoffs: number, y: number, yoffs: number, idx: number;
                    
                    var svg = $(element).get(0).childNodes[0];
                    
                    consoleService.log("Initializing the display...");

                    pixelBuffer = angular.copy(displayService.pixels);
                    
                    displayBuffer = [];

                    var paletteGenerator: Directives.Palette = new Directives.Palette();
                    palette = paletteGenerator.getPalette();

                    consoleService.log("Palette has been generated.");

                    // the 0x1000 display means a 64 x 64 matrix, we draw on a 192 x 192 surface 
                    // so that gives us a "pixel" as a 3x3 square using SVG rectangle 
                    // because jQuery doesn't understand SVG we manipulate the DOM directly
                    for (y = 0; y < Constants.Display.YMax; y += 1) {
                        for (x = 0; x < Constants.Display.XMax; x += 1) {                            
                            idx = y * Constants.Display.XMax + x;
                            xoffs = x * Constants.Display.XFactor;
                            yoffs = y * Constants.Display.YFactor;
                            var pixel: any = Display.MakeSvg("rect", {
                                x: xoffs,
                                y: yoffs,
                                width: Constants.Display.XFactor,
                                height: Constants.Display.YFactor     
                            });
                            pixel.setAttribute("style", "fill:" + palette[0]);
                            displayBuffer[idx] = pixel;                            
                            svg.appendChild(pixel);                            
                        }
                    }

                    consoleService.log("Built pixel map.");

                    // this directive is tightly coupled to the service so the service literally
                    // takes one callback so it can update the display when the memory is poked
                    displayService.callback = (address: number, value: number) => {
                        var safeAddress: number = address & Constants.Display.Max;
                        var safeValue: number = value & Constants.Memory.ByteMask;
                        pixelBuffer[safeAddress] = safeValue;
                        displayBuffer[safeAddress].removeAttribute("style");
                        displayBuffer[safeAddress].setAttribute("style", "fill:" + palette[safeValue]);
                    };

                    consoleService.log("Display initialized.");
                }
            };
        }
    }

    Main.App.Directives.directive("display", ["consoleService", "displayService", Display.Factory]);
}
