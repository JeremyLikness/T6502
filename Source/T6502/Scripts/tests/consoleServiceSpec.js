/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/services/consoleService.ts'/>
///<reference path="../globalConstants.ts"/>
var Tests;
(function (Tests) {
    describe("console service", function () {
        var consoleSvc;

        beforeEach(function () {
            module('app');
        });

        beforeEach(function () {
            inject(function (consoleService) {
                consoleSvc = consoleService;
            });
        });

        describe("given an instance of the console service when it is first called", function () {
            it("then should initialize the lines array to an empty list", function () {
                expect(consoleSvc.lines).toBeDefined();
                expect(consoleSvc.lines.length).toBe(0);
            });
        });

        describe("given an instance of the console service when the log method is called", function () {
            var message = "This is a test message.";

            beforeEach(function () {
                consoleSvc.log(message);
            });

            it("then should add the message to the lines array", function () {
                expect(consoleSvc.lines).toBeDefined();
                expect(consoleSvc.lines.length).toBe(1);
                expect(consoleSvc.lines[0]).toBe(message);
            });
        });

        describe("given an instance of the console service when the log method is called more than " + Constants.Display.ConsoleLines + " times", function () {
            var expected = (01).toString(16);

            beforeEach(function () {
                var x;
                for (x = 0; x <= Constants.Display.ConsoleLines; x++) {
                    consoleSvc.log(x.toString(16));
                }
            });

            it("then should truncate the the list to " + Constants.Display.ConsoleLines + " lines", function () {
                expect(consoleSvc.lines.length).toBe(Constants.Display.ConsoleLines);
                expect(consoleSvc.lines[0]).toBe(expected);
            });
        });
    });
})(Tests || (Tests = {}));
