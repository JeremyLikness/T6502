/// <reference path='../jasmine.d.ts'/>
/// <reference path='../../app/defs/angular.d.ts'/>
/// <reference path='../angular-mocks.d.ts'/>
/// <reference path='../../app/defs/jquery.d.ts'/>
/// <reference path='../../app/app.ts'/>
/// <reference path='../../app/services/cpuService.ts'/>
/// <reference path='../../app/services/consoleService.ts'/>
/// <reference path='../../app/emulator/compiler.ts'/>
/// <reference path='../../app/emulator/opCodes.ts'/>
var Tests;
(function (Tests) {
    describe("Stack Operations", function () {
        var cpuSvc;
        var cpu;
        var consoleSvc;
        var operation;

        function toHexAddress(address) {
            var padding = "0000";
            var result = padding + address.toString(16);
            return result.substring(result.length - 4, result.length).toUpperCase();
        }

        beforeEach(function () {
            module('app');
        });

        beforeEach(function () {
            inject(function (cpuService, consoleService) {
                cpuSvc = cpuService;
                consoleSvc = consoleService;
                cpu = cpuSvc.getCpu();
            });
        });

        describe("PHA - Push Accumulator to Stack", function () {
            beforeEach(function () {
                operation = new Emulator.PushAccumulatorSingle();
            });

            describe("given value in accumulator", function () {
                beforeEach(function () {
                    cpu.rA = 0x12;
                    operation.execute(cpu);
                });

                it("then should push the value to the stack", function () {
                    expect(cpu.stackPop()).toBe(0x12);
                });
            });
        });

        describe("PLA - Pull Accumulator from Stack", function () {
            beforeEach(function () {
                operation = new Emulator.PullAccumulatorSingle();
            });

            describe("given value in stack", function () {
                beforeEach(function () {
                    cpu.stackPush(0x12);
                    operation.execute(cpu);
                });

                it("then should set the accumulator to the value at the top of the stack", function () {
                    expect(cpu.rA).toBe(0x12);
                });
            });
        });
    });
})(Tests || (Tests = {}));
//@ sourceMappingURL=stackSpecs.js.map
