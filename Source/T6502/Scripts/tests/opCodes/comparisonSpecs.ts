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

    export interface IComparisonTest {
        memory: number;
        register: number;         
        comparison: string;
        carryFlag: boolean;
        zeroFlag: boolean;
    }

    var tests: IComparisonTest[] = [ {
        memory: 0x10, 
        register: 0x10,
        comparison: "Equal To", 
        carryFlag: true,
        zeroFlag: true
    }, {
        memory: 0x10, 
        register: 0x20,
        comparison: "Greater Than",
        carryFlag: true,
        zeroFlag: false 
    }, {
        memory: 0x20, 
        register: 0x10,
        comparison: "Less Than", 
        carryFlag: false, 
        zeroFlag: false
    }]; 

    var status = (value: boolean): string => {
        return value ? "set" : "reset"; 
    }

    var condition = (test: IComparisonTest, mode: string): string => {
        return "given register value that is " + test.comparison
        + " the memory value when compared as " + mode;
    }

    var result = (test: IComparisonTest): string => {
        return "then should " + status(test.carryFlag) + " the Carry Flag and " + status(test.zeroFlag) + " the Zero Flag";
    }

    describe("Comparison Operators", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;

        var zeroPage: number = 0x50; 
        var xOffset: number = 0x05; 
        var yOffset: number = 0x20; 
        var memoryLocation: number = 0xC000;

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

        describe("CMP", () => {

            describe("CMP Immediate", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorImmediate();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Immediate"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, test.memory);
                                cpu.rA = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CMP Zero Page", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorZeroPage();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Zero Page"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage, test.memory);
                                cpu.rA = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CMP Zero Page, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorZeroPageX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Zero Page, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage + xOffset, test.memory);
                                cpu.rA = test.register; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CMP Absolute", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorAbsolute();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Absolute"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CMP Absolute, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorAbsoluteX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Absolute, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + xOffset, test.memory);
                                cpu.rA = test.register;
                                cpu.rX = xOffset; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });                                  
            
            describe("CMP Absolute, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorAbsoluteY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Absolute, Y"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.register; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CMP Indirect, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorIndexedIndirectX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage + xOffset, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + xOffset + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.register; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CMP Indirect, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareAccumulatorIndirectIndexedY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.register; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });      
        });

        describe("CPX", () => {

            describe("CPX Immediate", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareXImmediate();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Immediate"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, test.memory);
                                cpu.rX = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CPX Zero Page", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareXZeroPage();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Zero Page"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage, test.memory);
                                cpu.rX = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });

            describe("CPX Absolute", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareXAbsolute();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Absolute"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rX = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
        });
        
        describe("CPY", () => {

            describe("CPY Immediate", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareYImmediate();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Immediate"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, test.memory);
                                cpu.rY = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("CPY Zero Page", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareYZeroPage();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Zero Page"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage, test.memory);
                                cpu.rY = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });

            describe("CPY Absolute", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.CompareYAbsolute();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IComparisonTest = tests[idx];
                    var executeTest = (test: IComparisonTest) => {
                    
                        describe(condition(test, "Absolute"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rY = test.register; 
                                operation.execute(cpu);
                            });

                            it(result(test), () => {
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.carryFlag);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.zeroFlag);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
        });       
    });
}