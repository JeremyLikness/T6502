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

    export interface IBitwiseTest {
        memory: number;
        operand: number;         
    }

    var tests: IBitwiseTest[] = []; 

    var condition = (test: IBitwiseTest, operation: string, mode: string): string => {
        return "given memory value of " + test.memory.toString(10) +
        " and accumulator value of " + test.operand.toString(10) +
        " when " + operation + " applied as " + mode;
    }

    var result = (test: IBitwiseTest, result: number): string => {
        return "then should update the accumulator with a value of " + result;
    }

    describe("Bitwise Operators", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;

        var zeroPage: number = 0x50; 
        var xOffset: number = 0x05; 
        var yOffset: number = 0x20; 
        var memoryLocation: number = 0xC000;

        var max: number = 0xFF; 
        var min: number = 0x00; 
            
        while (max >= 0) {
            tests.push({
                memory: max, 
                operand: min
            });

            max -= 0x1F;
            min = (min + 0x13) & 0xFF;                                 
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

        describe("AND", () => {

            describe("AND Immediate", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndImmediate();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Immediate"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("AND Zero Page", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndZeroPage();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Zero Page"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("AND Zero Page, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndZeroPageX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Zero Page, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage + xOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("AND Absolute", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndAbsolute();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Absolute"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("AND Absolute, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndAbsoluteX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Absolute, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + xOffset, test.memory);
                                cpu.rA = test.operand;
                                cpu.rX = xOffset; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });                                  
            
            describe("AND Absolute, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndAbsoluteY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Absolute, Y"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("AND Indirect, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndIndirectX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage + xOffset, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + xOffset + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("AND Indirect, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.AndIndirectY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "AND", "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory & test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });      
        });

        describe("EOR", () => {

            describe("EOR Immediate", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrImmediate();
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Immediate"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("EOR Zero Page", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrZeroPage();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Zero Page"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("EOR Zero Page, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrZeroPageX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Zero Page, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage + xOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("EOR Absolute", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrAbsolute();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Absolute"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("EOR Absolute, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrAbsoluteX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Absolute, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + xOffset, test.memory);
                                cpu.rA = test.operand;
                                cpu.rX = xOffset; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });                                  
            
            describe("EOR Absolute, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrAbsoluteY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Absolute, Y"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("EOR Indirect, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrIndirectX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage + xOffset, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + xOffset + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("EOR Indirect, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.ExclusiveOrIndirectY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "EOR", "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory ^ test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });      
        });

        describe("ORA (OR Accumulator)", () => {

            describe("ORA Immediate", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrImmediate();
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Immediate"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("ORA Zero Page", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrZeroPage();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Zero Page"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("ORA Zero Page, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrZeroPageX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Zero Page, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(zeroPage + xOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("ORA Absolute", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrAbsolute();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Absolute"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.operand; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("ORA Absolute, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrAbsoluteX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Absolute, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + xOffset, test.memory);
                                cpu.rA = test.operand;
                                cpu.rX = xOffset; 
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });                                  
            
            describe("ORA Absolute, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrAbsoluteY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Absolute, Y"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("ORA Indirect, X", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrIndirectX();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage + xOffset, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + xOffset + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rX = xOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });
            
            describe("ORA Indirect, Y", () => {                
                
                beforeEach(() => {
                    operation = new Emulator.OrIndirectY();                    
                });

                var idx: number;

                for(idx = 0; idx < tests.length; idx++) {
                    var test: IBitwiseTest = tests[idx];
                    var executeTest = (test: IBitwiseTest) => {
                    
                        describe(condition(test, "ORA", "Indirect, X"), () => {
                        
                            beforeEach(() => {
                                cpu.poke(zeroPage, memoryLocation & Constants.Memory.ByteMask);
                                cpu.poke(zeroPage + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                                cpu.poke(cpu.rPC, zeroPage);
                                cpu.poke(memoryLocation + yOffset, test.memory);
                                cpu.rA = test.operand; 
                                cpu.rY = yOffset;
                                operation.execute(cpu);
                            });

                            var resultValue: number = test.memory | test.operand; 

                            it(result(test, resultValue), () => {
                                expect(cpu.rA).toBe(resultValue);
                            });
                        });
                    };
                    executeTest(test);
                }
            });      
        });

    });
}