/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/services/consoleService.ts'/>
///<reference path="../globalConstants.ts"/>

module Tests {

    describe("console service", () => {

        var consoleSvc: Services.IConsoleService;
  
        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject((consoleService) => {
                consoleSvc = consoleService;
            });
        });

        describe("given an instance of the console service when it is first called", () => {
            it("then should initialize the lines array to an empty list", () => {        
                expect(consoleSvc.lines).toBeDefined();
                expect(consoleSvc.lines.length).toBe(0);
            });
        });

        describe("given an instance of the console service when the log method is called", () => {          

            var message: string = "This is a test message.";

            beforeEach(() => {
                consoleSvc.log(message);
            });

            it("then should add the message to the lines array", () => {
                expect(consoleSvc.lines).toBeDefined();
                expect(consoleSvc.lines.length).toBe(1);
                expect(consoleSvc.lines[0]).toBe(message);
            });                                  
        });

        describe("given an instance of the console service when the log method is called more than " + Constants.Display.ConsoleLines + " times", () => {
            
            var expected: string = (01).toString(16);

            beforeEach(() => {
                var x: number;
                for (x = 0; x <= Constants.Display.ConsoleLines; x++) {
                    consoleSvc.log(x.toString(16));
                }
            });

            it("then should truncate the the list to " + Constants.Display.ConsoleLines + " lines", () => {
                expect(consoleSvc.lines.length).toBe(Constants.Display.ConsoleLines);
                expect(consoleSvc.lines[0]).toBe(expected);
            });
        
        });
    });
}