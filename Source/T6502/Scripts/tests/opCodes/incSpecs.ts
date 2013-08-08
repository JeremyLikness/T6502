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

    describe("Increment Specs", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;
        var regularValue: number = 0x12;
        var regularValueAfter: number = regularValue + 1;
        var negativeValue: number = 0x81;
        var negativeValueAfter: number = negativeValue + 1;
        var flipValue: number = 0xFF;
        var address: number = 0xC000;
        var zeroPage: number = 0x50;
        var xOffset: number = 0x05;

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

        describe("INX - Increment X Register", () => {

            beforeEach(() => {
                operation = new Emulator.IncrementXSingle();
            });

            describe("given any value less than 0xFF", () => {
                beforeEach(() => {
                    cpu.rX = regularValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the X register to one more than the value", () => {
                    expect(cpu.rX)
                        .toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value other than 0xFF", () => {
                beforeEach(() => {
                    cpu.rX = negativeValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the X register to one more than the value and set the negative flag", () => {
                    expect(cpu.rX)
                        .toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0xFF", () => {
                beforeEach(() => {
                    cpu.rX = flipValue
                    operation.execute(cpu);                    
                }); 

                it("then should set the X register to zero (roll) and set the zero flag", () => {
                    expect(cpu.rX).toBe(0);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                });            
            });
        });

        describe("INY - Increment Y Register", () => {

            beforeEach(() => {
                operation = new Emulator.IncYSingle();
            });

            describe("given any value less than 0xFF", () => {
                beforeEach(() => {
                    cpu.rY = regularValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the Y register to one more than the value", () => {
                    expect(cpu.rY)
                        .toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value other than 0xFF", () => {
                beforeEach(() => {
                    cpu.rY = negativeValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the Y register to one more than the value and set the negative flag", () => {
                    expect(cpu.rY)
                        .toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0xFF", () => {
                beforeEach(() => {
                    cpu.rY = flipValue
                    operation.execute(cpu);                    
                }); 

                it("then should set the Y register to zero (roll) and set the zero flag", () => {
                    expect(cpu.rY).toBe(0);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                });            
            });
        });

        describe("INC - Absolute", () => {

            beforeEach(() => {
                operation = new Emulator.IncAbsolute();
                cpu.poke(cpu.rPC, address & Constants.Memory.ByteMask);
                cpu.poke(cpu.rPC + 1, (address >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    
            });

            describe("given any value less than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(address, regularValue);                
                    operation.execute(cpu);                                        
                }); 

                it("then should set the memory location to one more than the value", () => {
                    expect(cpu.peek(address)).toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value other than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(address, negativeValue);                           
                    operation.execute(cpu);                             
                }); 

                it("then should set the memory location to one more than the value and set the negative flag", () => {
                    expect(cpu.peek(address)).toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(address, flipValue);
                    operation.execute(cpu);                    
                }); 

                it("then should set the memory location to zero (roll) and set the zero flag", () => {
                    expect(cpu.peek(address)).toBe(0);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                });            
            });
        });

        describe("INC - Absolute X", () => {

            beforeEach(() => {
                operation = new Emulator.IncAbsoluteX();
                cpu.poke(cpu.rPC, address & Constants.Memory.ByteMask);
                cpu.poke(cpu.rPC + 1, (address >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                cpu.rX = xOffset;    
            });

            describe("given any value less than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(address + xOffset, regularValue);                
                    operation.execute(cpu);                                        
                }); 

                it("then should set the memory location with the X register offset applied to one more than the value", () => {
                    expect(cpu.peek(address + xOffset)).toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value other than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(address + xOffset, negativeValue);                           
                    operation.execute(cpu);                             
                }); 

                it("then should set the memory location with the X register offset applied to one more than the value and set the negative flag", () => {
                    expect(cpu.peek(address + xOffset)).toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(address + xOffset, flipValue);
                    operation.execute(cpu);                    
                }); 

                it("then should set the memory location with the X register offset applied to zero (roll) and set the zero flag", () => {
                    expect(cpu.peek(address + xOffset)).toBe(0);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                });            
            });
        });

        describe("INC - Zero Page", () => {

            beforeEach(() => {
                operation = new Emulator.IncZeroPage();
                cpu.poke(cpu.rPC, zeroPage);                
                    
            });

            describe("given any value less than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(zeroPage, regularValue);                
                    operation.execute(cpu);                                        
                }); 

                it("then should set the memory location to one more than the value", () => {
                    expect(cpu.peek(zeroPage)).toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value other than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(zeroPage, negativeValue);                           
                    operation.execute(cpu);                             
                }); 

                it("then should set the memory location to one more than the value and set the negative flag", () => {
                    expect(cpu.peek(zeroPage)).toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(zeroPage, flipValue);
                    operation.execute(cpu);                    
                }); 

                it("then should set the memory location to zero (roll) and set the zero flag", () => {
                    expect(cpu.peek(zeroPage)).toBe(0);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                });            
            });
        });

        describe("INC - Zero Page, X", () => {

            beforeEach(() => {
                operation = new Emulator.IncZeroPageX();
                cpu.poke(cpu.rPC, zeroPage);
                cpu.rX = xOffset;    
            });

            describe("given any value less than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(zeroPage + xOffset, regularValue);                
                    operation.execute(cpu);                                        
                }); 

                it("then should set the memory location with the X register offset applied to one more than the value", () => {
                    expect(cpu.peek(zeroPage + xOffset)).toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value other than 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(zeroPage + xOffset, negativeValue);                           
                    operation.execute(cpu);                             
                }); 

                it("then should set the memory location with the X register offset applied to one more than the value and set the negative flag", () => {
                    expect(cpu.peek(zeroPage + xOffset)).toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0xFF", () => {
                beforeEach(() => {
                    cpu.poke(zeroPage + xOffset, flipValue);
                    operation.execute(cpu);                    
                }); 

                it("then should set the memory location with the X register offset applied to zero (roll) and set the zero flag", () => {
                    expect(cpu.peek(zeroPage + xOffset)).toBe(0);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                });            
            });
        });
    });
}
