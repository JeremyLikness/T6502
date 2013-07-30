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
    describe("Flag Operations", function () {
        var cpuSvc;
        var cpu;
        var consoleSvc;
        var operation;
        var registers;

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
                registers = cpu.rP;
            });
        });

        describe("CLD - Clear Decimal Flag", function () {
            beforeEach(function () {
                operation = new Emulator.ClearDecimalSingle();
            });

            describe("given decimal flag not set", function () {
                beforeEach(function () {
                    operation.execute(cpu);
                });

                it("then should not affect registers", function () {
                    expect(cpu.rP).toBe(registers);
                });
            });

            describe("given decimal flag set", function () {
                beforeEach(function () {
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    operation.execute(cpu);
                });

                it("then should set registers back to original", function () {
                    expect(cpu.rP).toBe(registers);
                });
            });
        });
    });
})(Tests || (Tests = {}));
//@ sourceMappingURL=flagSpecs.js.map
