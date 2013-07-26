/// <reference path='../jasmine.d.ts'/>
/// <reference path='../../app/defs/angular.d.ts'/>
/// <reference path='../angular-mocks.d.ts'/>
/// <reference path='../../app/defs/jquery.d.ts'/>
/// <reference path='../../app/app.ts'/>
/// <reference path='../../app/services/cpuService.ts'/>
/// <reference path='../../app/services/consoleService.ts'/>
/// <reference path='../../app/emulator/compiler.ts'/>
/// <reference path='../../app/emulator/opCodes.ts'/>

module Tests {

    describe("ADC - Add with Carry", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;

        function toHexAddress(address: number) {
            var padding: string = "0000";
            var result: string = padding + address.toString(16);
            return result.substring(result.length - 4, result.length).toUpperCase();                
        }
  
        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject((cpuService, consoleService) => {
                cpuSvc = cpuService;
                consoleSvc = consoleService;
                cpu = cpuSvc.getCpu();                
            });
        });

        describe("ADC Immediate", () => {
            beforeEach(() => {
                operation = new Emulator.AddWithCarryImmediate();
            });

            describe("given not decimal mode and no carry flag set", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x46);
                    cpu.rA = 0x58;
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and keep carry flag clear", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x46 + 0x58);
                });
            });

            describe("given not decimal mode and carry flag set", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x46);
                    cpu.rA = 0x58;
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and reset the carry flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x46 + 0x58 + 0x01);
                });
            });

            describe("given not decimal mode and addition results in carry", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0xFE);
                    cpu.rA = 0x02;
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and set the carry flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                    expect(cpu.rA).toBe((0xFE + 0x02) & Constants.Memory.ByteMask);
                });
            });

            describe("given decimal mode and no carry flag set", () => {
                
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x22);
                    cpu.rA = 0x22;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and keep the carry flag clear", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x44);
                });
            });

            describe("given decimal mode and carry flag set", () => {
                
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x22);
                    cpu.rA = 0x22;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and reset the carry flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(false);
                    expect(cpu.rA).toBe(0x45);
                });
            });

            describe("given decimal mode and addition that carries", () => {
                
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x46);
                    cpu.rA = 0x58;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and set the carry flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                    expect(cpu.rA).toBe(0x04);
                });
            });
        });
    });
}