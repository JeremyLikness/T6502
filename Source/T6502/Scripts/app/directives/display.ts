///<reference path="../app.ts"/>
///<reference path="../services/consoleService.ts"/>
///<reference path="../services/displayService.ts"/>

module Directives {

    export class Display {

        private static ToHex(value: number): string {
            var result = value.toString(16);
            return result.length == 1 ? "0" + result : result;
        }

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
                    var lowValues: number[] = [ 0x10, 0x40, 0x70, 0xa0, 0xd0, 0xff ];
                    var greenValues: number[] = [ 0x10, 0x38, 0x60, 0x88, 0xb0, 0xd8, 0xff ];
                    var x: number, xoffs: number, y: number, yoffs: number, idx: number;
                    var red: number, green: number, blue: number;
                    var redValue: number, blueValue: number, greenValue: number;
                    
                    var svg = $(element).get(0).childNodes[0];
                    
                    consoleService.log("Initializing the display...");

                    pixelBuffer = angular.copy(displayService.pixels);
                    
                    displayBuffer = [];
                    palette = [];

                    // palette slightly favors green, builds all combinations from dark to light
                    // then adds 5 shades of gray ending in white
                    for (red = 0; red < 6; red += 1) {
                        for (green = 0; green < 7; green += 1) {
                            for (blue = 0; blue < 6; blue += 1) {
                                redValue = lowValues[red];
                                greenValue = greenValues[green];
                                blueValue = lowValues[blue];
                                idx = ((red * 7 + green) * 6) + blue;
                                if (idx === 0) {
                                    redValue = greenValue = blueValue = 0;
                                }
                                palette[idx] = "#" + Display.ToHex(redValue) + Display.ToHex(greenValue)
                                    + Display.ToHex(blueValue);                                                                
                            }
                        }
                    }

                    palette[0xfb] = "#111111"; 
                    palette[0xfc] = "#555555";
                    palette[0xfd] = "#999999";
                    palette[0xfe] = "#cccccc";
                    palette[0xff] = "#ffffff"; 
                    
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
