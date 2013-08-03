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

    export interface ISbcTest {
        carryFlag: boolean;
        accumulator: number;
        immediate: number;
        expectedResult: number;
        expectedCarry: boolean;
        expectedOverflow: boolean;
        expectedZero: boolean;
        expectedNegative: boolean; 
    }

    function status(item: boolean): string {
        return item ? "set" : "reset"; 
    }

    function given(test: ISbcTest): string {
        return "given carry flag " + status(test.carryFlag) + 
            " and accumulator with value of " + test.accumulator.toString(10) + 
            " when SBC executed with value of " + test.immediate.toString(10);
    }

    function then(test: ISbcTest): string {
        return "then should provide result of " + test.expectedResult.toString(10) +
         " with carry flag " + status(test.expectedCarry) +
         " and negative flag " + status(test.expectedNegative) + 
         " and zero flag " + status(test.expectedZero) + 
         " and negative flag " + status(test.expectedNegative); 
    }

    var nonDecimalTests: ISbcTest[] = [ {
        carryFlag: true,
        accumulator: 0x20,
        immediate: 0x10, 
        expectedResult: 0x10,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: false
    }, {
        carryFlag: true,
        accumulator: 0x20,
        immediate: 0x20, 
        expectedResult: 0x00,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: true,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x20,
        immediate: 0x21, 
        expectedResult: 0xFF,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: true,
        accumulator: 0x20,
        immediate: 0x81, 
        expectedResult: 0x9F,
        expectedCarry: false,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: true,
        accumulator: 0x90,
        immediate: 0x40, 
        expectedResult: 0x50,
        expectedCarry: true,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x90,
        immediate: 0x90, 
        expectedResult: 0x00,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: true,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x90,
        immediate: 0xa0, 
        expectedResult: 0xF0,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x20,
        immediate: 0x10, 
        expectedResult: 0x0F,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: false
    }, {
        carryFlag: false,
        accumulator: 0x20,
        immediate: 0x20, 
        expectedResult: 0xFF,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x20,
        immediate: 0x21, 
        expectedResult: 0xFE,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x20,
        immediate: 0x81, 
        expectedResult: 0x9E,
        expectedCarry: false,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x90,
        immediate: 0x40, 
        expectedResult: 0x4F,
        expectedCarry: true,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: false    
    }, {
        carryFlag: false,
        accumulator: 0x90,
        immediate: 0x90, 
        expectedResult: 0xFF,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true
    }, {
        carryFlag: false,
        accumulator: 0x90,
        immediate: 0xa0, 
        expectedResult: 0xEF,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }
         
    ];

    var decimalTests: ISbcTest[] = [ {
        carryFlag: true,
        accumulator: 0x22,
        immediate: 0x11, 
        expectedResult: 0x11,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: false
    }, {
        carryFlag: true,
        accumulator: 0x22,
        immediate: 0x22, 
        expectedResult: 0x00,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: true,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x22,
        immediate: 0x23, 
        expectedResult: 0x99,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: true,
        accumulator: 0x22,
        immediate: 0x82, 
        expectedResult: 0x40,
        expectedCarry: false,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x99,
        immediate: 0x44, 
        expectedResult: 0x55,
        expectedCarry: true,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x99,
        immediate: 0x99, 
        expectedResult: 0x00,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: true,
        expectedNegative: false    
    }, {
        carryFlag: true,
        accumulator: 0x99,
        immediate: 0xaa, 
        expectedResult: 0x89,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x22,
        immediate: 0x11, 
        expectedResult: 0x10,
        expectedCarry: true,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: false
    }, {
        carryFlag: false,
        accumulator: 0x22,
        immediate: 0x22, 
        expectedResult: 0x99,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x22,
        immediate: 0x23, 
        expectedResult: 0x98,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }, {
        carryFlag: false,
        accumulator: 0x22,
        immediate: 0x82, 
        expectedResult: 0x39,
        expectedCarry: false,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: false    
    }, {
        carryFlag: false,
        accumulator: 0x99,
        immediate: 0x44, 
        expectedResult: 0x54,
        expectedCarry: true,
        expectedOverflow: true,
        expectedZero: false,
        expectedNegative: false    
    }, {
        carryFlag: false,
        accumulator: 0x99,
        immediate: 0x99, 
        expectedResult: 0x99,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true
    }, {
        carryFlag: false,
        accumulator: 0x99,
        immediate: 0xaa, 
        expectedResult: 0x88,
        expectedCarry: false,
        expectedOverflow: false,
        expectedZero: false,
        expectedNegative: true    
    }
         
    ];

    describe("SBC - Subtract with Carry", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;

        var zeroPage: number = 0x50; 
        var xOffset: number = 0x05; 
        var yOffset: number = 0x20; 
        var memoryValue: number = 0x10; 
        var accumulatorValue: number = 0x30; 
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

        describe("SBC Immediate", () => {
        
            var testSuite = (test: ISbcTest, decimalFlag: boolean) => {
                
                        describe(given(test), () => {
                        
                            beforeEach(() => {
                                cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, decimalFlag);
                                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, test.carryFlag);
                                cpu.rA = test.accumulator;
                                cpu.poke(cpu.rPC, test.immediate);
                                operation.execute(cpu);
                            });
                        
                            it(then(test), () => {
                                expect(cpu.rA).toBe(test.expectedResult);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(test.expectedCarry);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(test.expectedNegative);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(test.expectedOverflow);
                                expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(test.expectedZero);
                            });
                        });
                    };

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryImmediate();
                cpu.rP = 0x0; 
            });

            var idx: number;

            describe("given binary mode", () => {
                for (idx = 0; idx < nonDecimalTests.length; idx ++) {            
                    var testItem: ISbcTest = nonDecimalTests[idx];
                    testSuite(testItem, false);
                }
            });
            
            describe("given decimal mode", () => { 
                for (idx = 0; idx < decimalTests.length; idx ++) {            
                    var testItem: ISbcTest = decimalTests[idx];
                    testSuite(testItem, true);                    
                } 
             });           
        });

        describe("SBC Zero Page", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryZeroPage();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given a zero page address", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, zeroPage);
                    cpu.poke(zeroPage, memoryValue);
                    cpu.rA = accumulatorValue; 
                    operation.execute(cpu);
                });

                it("then should subtract the number at the address", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });

        describe("SBC Zero Page, X", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryZeroPageX();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given a zero page address and X offset", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, zeroPage);
                    cpu.poke(zeroPage + xOffset, memoryValue);
                    cpu.rA = accumulatorValue;
                    cpu.rX = xOffset; 
                    operation.execute(cpu);
                });

                it("then should subtract the number at the address computed with the X offset", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });

        describe("SBC Absolute", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryAbsolute();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given an absolute address", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                    cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    cpu.poke(memoryLocation, memoryValue);
                    cpu.rA = accumulatorValue;
                    operation.execute(cpu);
                });

                it("then should subtract the number at the address", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });

        describe("SBC Absolute X", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryAbsoluteX();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given an absolute address and X offset", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                    cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    cpu.poke(memoryLocation + xOffset, memoryValue);
                    cpu.rA = accumulatorValue
                    cpu.rX = xOffset;
                    operation.execute(cpu);
                });

                it("then should subtract the number at the address adjusted by the X offset", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });

        describe("SBC Absolute Y", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryAbsoluteY();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given an absolute address and Y offset", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                    cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    cpu.poke(memoryLocation + yOffset, memoryValue);
                    cpu.rA = accumulatorValue;
                    cpu.rY = yOffset;
                    operation.execute(cpu);
                });

                it("then should subtract the number at the address adjusted by the Y offset", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });

        describe("SBC Indexed Indirect X", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryIndexedIndirectX();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given a zero page address and X offset", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, zeroPage);
                    cpu.poke(zeroPage + xOffset, memoryLocation & Constants.Memory.ByteMask);
                    cpu.poke(zeroPage + xOffset + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    cpu.poke(memoryLocation, memoryValue);
                    cpu.rA = accumulatorValue;
                    cpu.rX = xOffset;
                    operation.execute(cpu);
                });

                it("then should locate the address at the zero page offset and use the value at that address to subtract", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });

        describe("SBC Indirect Indexed Y", () => {

            beforeEach(() => {
                operation = new Emulator.SubtractWithCarryIndirectIndexedY();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
            });

            describe("Given a zero page address and Y offset", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, zeroPage);
                    cpu.poke(zeroPage, memoryLocation & Constants.Memory.ByteMask);
                    cpu.poke(zeroPage + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    cpu.poke(memoryLocation + yOffset, memoryValue);
                    cpu.rA = accumulatorValue;
                    cpu.rY = yOffset;
                    operation.execute(cpu);
                });

                it("then should locate the address at the zero page offset then take that addres plus the y offset to subtract", () => {
                    expect(cpu.rA).toBe(accumulatorValue - memoryValue);
                });

            });
        });
    });
}