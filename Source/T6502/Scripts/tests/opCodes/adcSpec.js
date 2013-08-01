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
    describe("ADC - Add with Carry", function () {
        var cpuSvc;
        var cpu;
        var consoleSvc;
        var operation;

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

        describe("ADC Immediate", function () {
            beforeEach(function () {
                operation = new Emulator.AddWithCarryImmediate();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
            });

            describe("given not decimal mode and no carry flag set", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0x46);
                    cpu.rA = 0x58;
                    operation.execute(cpu);
                });

                it("then should add the numbers and keep carry flag clear", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x46 + 0x58);
                });
            });

            describe("given not decimal mode and carry flag set", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0x46);
                    cpu.rA = 0x58;
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    operation.execute(cpu);
                });

                it("then should add the numbers and reset the carry flag", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x46 + 0x58 + 0x01);
                });
            });

            describe("given not decimal mode and addition results in carry", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0xFE);
                    cpu.rA = 0x02;
                    operation.execute(cpu);
                });

                it("then should add the numbers and set the carry flag", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                    expect(cpu.rA).toBe((0xFE + 0x02) & Constants.Memory.ByteMask);
                });
            });

            describe("given no unsigned carry but signed overflow", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0x50);
                    cpu.rA = 0x50;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
                    operation.execute(cpu);
                });

                it("then should add the numbers and set the overflow flag", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(true);
                    expect(cpu.rA).toBe(0xa0);
                });
            });

            describe("given unsigned carry and signed overflow", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0xd0);
                    cpu.rA = 0x90;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
                    operation.execute(cpu);
                });

                it("then should add the numbers and set the carry and set the overflow flag", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                    expect(cpu.rA).toBe(0x60);
                });
            });

            describe("given decimal mode and no carry flag set", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0x22);
                    cpu.rA = 0x22;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    operation.execute(cpu);
                });

                it("then should add the numbers and keep the carry flag clear", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x44);
                });
            });

            describe("given decimal mode and carry flag set", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0x22);
                    cpu.rA = 0x22;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    operation.execute(cpu);
                });

                it("then should add the numbers and reset the carry flag", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x45);
                });
            });

            describe("given decimal mode and addition that carries", function () {
                beforeEach(function () {
                    cpu.poke(cpu.rPC, 0x46);
                    cpu.rA = 0x58;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    operation.execute(cpu);
                });

                it("then should add the numbers and set the carry flag", function () {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                    expect(cpu.rA).toBe(0x04);
                });
            });
        });
    });
})(Tests || (Tests = {}));
//@ sourceMappingURL=adcSpec.js.map
