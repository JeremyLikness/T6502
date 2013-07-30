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

    describe("LDA - Load Accumulator", () => {

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

        describe("Values", () => {

            beforeEach(() => {
                operation = new Emulator.LoadAccumulatorImmediate();
            });

            describe("given any value", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x12);
                    operation.execute(cpu);                    
                }); 

                it("then should set the accumulator to the value", () => {
                    expect(cpu.rA)
                        .toBe(0x12);                    
                });            
            });

            describe("given zero value", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x00);
                    operation.execute(cpu);                    
                }); 

                it("then should set the zero flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet))
                        .toBe(true);                    
                });            
            });

            describe("given non-zero value", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x01);
                    cpu.setFlag(Constants.ProcessorStatus.ZeroFlagSet, true);
                    operation.execute(cpu);                    
                }); 

                it("then should reset the zero flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet))
                        .toBe(false);                    
                });            
            });

            describe("given negative value", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x81);
                    operation.execute(cpu);                    
                }); 

                it("then should set the negative flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet))
                        .toBe(true);                    
                });            
            });

            describe("given non-negative value", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x7f);
                    cpu.setFlag(Constants.ProcessorStatus.NegativeFlagSet, true);
                    operation.execute(cpu);                    
                }); 

                it("then should reset the negative flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet))
                        .toBe(false);                    
                });            
            });
        });

        describe("Modes", () => {

            describe("Given LDA Absolute", () => {

                beforeEach(() => {
                    operation = new Emulator.LoadAccumulatorAbsolute();
                });

                describe("then should load the value at the specified address", () => {
                    beforeEach(() => {
                        cpu.poke(cpu.rPC, 0x00);
                        cpu.poke(cpu.rPC + 1, 0xc0);
                        cpu.poke(0xC000, 0x12);
                        operation.execute(cpu);                    
                    }); 

                    it("then should set the accumulator to the value", () => {
                        expect(cpu.rA)
                            .toBe(0x12);                    
                    });            
                });
            });

            describe("Given LDA Absolute X", () => {

                beforeEach(() => {
                    operation = new Emulator.LoadAccumulatorAbsoluteX();
                });

                describe("given a value at the specified address with X offset", () => {
                    beforeEach(() => {
                        cpu.poke(cpu.rPC, 0x00);
                        cpu.poke(cpu.rPC + 1, 0xc0);
                        cpu.poke(0xC00A, 0x12);
                        cpu.rX = 0x0A; 
                        operation.execute(cpu);                    
                    }); 

                    it("then should set the accumulator to the value", () => {
                        expect(cpu.rA)
                            .toBe(0x12);                    
                    });            
                });
            });

            describe("Given LDA Zero Page", () => {

                beforeEach(() => {
                    operation = new Emulator.LoadAccumulatorZeroPage();
                });

                describe("given a value value at the specified zero page address", () => {
                    beforeEach(() => {
                        cpu.poke(cpu.rPC, 0x50);
                        cpu.poke(0x50, 0x12);
                        operation.execute(cpu);                    
                    }); 

                    it("then should set the accumulator to the value", () => {
                        expect(cpu.rA)
                            .toBe(0x12);                    
                    });            
                });
            });
        });
    });
}