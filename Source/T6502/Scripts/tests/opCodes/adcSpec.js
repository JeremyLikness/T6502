var Tests;
(function (Tests) {
    describe("ADC - Add with Carry", function () {
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

        describe("ADC Immediate", function () {
            beforeEach(function () {
                operation = new Emulator.AddWithCarryImmediate();
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
