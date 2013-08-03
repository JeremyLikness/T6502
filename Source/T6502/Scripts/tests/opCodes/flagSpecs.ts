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

    describe("Flag Operations", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;
        var registers: number;

        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject((cpuService, consoleService) => {
                cpuSvc = cpuService;
                consoleSvc = consoleService;
                cpu = cpuSvc.getCpu();
                registers = cpu.rP;                
            });
        });

        describe("CLD - Clear Decimal Flag", () => {
            beforeEach(() => {
                operation = new Emulator.ClearDecimalSingle();
            });

            describe("given decimal flag not set", () => {
                beforeEach(() => {
                    operation.execute(cpu);
                }); 

                it("then should not affect registers", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });

            describe("given decimal flag set", () => {
                beforeEach(() => {
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should set registers back to original", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });            
        });

        describe("SED - Set Decimal Flag", () => {
            beforeEach(() => {
                operation = new Emulator.SetDecimalSingle();
            });

            describe("given decimal flag not set", () => {
                beforeEach(() => {
                    operation.execute(cpu);
                }); 

                it("then should set decimal flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)).toBe(true);
                });
            });

            describe("given decimal flag set", () => {
                beforeEach(() => {
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
                    registers = cpu.rP;
                    operation.execute(cpu);
                }); 

                it("then should not affect registers", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });            
        });

        describe("CLC - Clear Carry Flag", () => {
            beforeEach(() => {
                operation = new Emulator.ClearCarrySingle();
            });

            describe("given carry flag not set", () => {
                beforeEach(() => {
                    operation.execute(cpu);
                }); 

                it("then should not affect registers", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });

            describe("given carry flag set", () => {
                beforeEach(() => {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should set registers back to original", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });            
        });

        describe("SEC - Set Carry Flag", () => {
            beforeEach(() => {
                operation = new Emulator.SetCarrySingle();
            });

            describe("given carry flag not set", () => {
                beforeEach(() => {
                    operation.execute(cpu);
                }); 

                it("then should set carry flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                });
            });

            describe("given carry flag set", () => {
                beforeEach(() => {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    registers = cpu.rP;
                    operation.execute(cpu);
                }); 

                it("then should not affect registers", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });            
        });

        describe("CLC - Clear Overflow Flag", () => {
            beforeEach(() => {
                operation = new Emulator.ClearOverflowSingle();
            });

            describe("given overflow flag not set", () => {
                beforeEach(() => {
                    operation.execute(cpu);
                }); 

                it("then should not affect registers", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });

            describe("given overflow flag set", () => {
                beforeEach(() => {
                    cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, true);
                    operation.execute(cpu);
                }); 

                it("then should set registers back to original", () => {
                    expect(cpu.rP).toBe(registers);
                });
            });            
        });
    });
}