/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/services/consoleService.ts'/>

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

        describe("given console service when called", () => {
            it("then should initialize the lines array", () => {        
                expect(consoleSvc.lines).toBeDefined();
                expect(consoleSvc.lines.length).toBe(0);
            });
        });

        describe("given console service when log method called", () => {          

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
    });
}