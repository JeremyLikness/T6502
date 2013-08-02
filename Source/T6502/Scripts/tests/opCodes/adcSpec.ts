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

        var zeroPage: number = 0x50; 
        var xOffset: number = 0x05; 
        var yOffset: number = 0x20; 
        var memoryValue: number = 0x10; 
        var accumulatorValue: number = 0x20; 
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

        describe("ADC Immediate", () => {
            beforeEach(() => {
                operation = new Emulator.AddWithCarryImmediate();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
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

            describe("given no unsigned carry but signed overflow", () => {
                
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x50);
                    cpu.rA = 0x50;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and set the overflow flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(true);
                    expect(cpu.rA).toBe(0xa0);
                });
            });

            describe("given unsigned carry and signed overflow", () => {
                
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0xd0);
                    cpu.rA = 0x90;
                    cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
                    operation.execute(cpu);
                }); 

                it("then should add the numbers and set the carry and set the overflow flag", () => {
                    expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)).toBe(true);
                    expect(cpu.rA).toBe(0x60);
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

        describe("ADC Zero Page", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryZeroPage();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
            });

            describe("Given a zero page address", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, zeroPage);
                    cpu.poke(zeroPage, memoryValue);
                    cpu.rA = accumulatorValue; 
                    operation.execute(cpu);
                });

                it("then should add the number at the address", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });

        describe("ADC Zero Page, X", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryZeroPageX();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
            });

            describe("Given a zero page address and X offset", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, zeroPage);
                    cpu.poke(zeroPage + xOffset, memoryValue);
                    cpu.rA = accumulatorValue;
                    cpu.rX = xOffset; 
                    operation.execute(cpu);
                });

                it("then should add the number at the address computed with the X offset", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });

        describe("ADC Absolute", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryAbsolute();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
            });

            describe("Given an absolute address", () => {

                beforeEach(() => {
                    cpu.poke(cpu.rPC, memoryLocation & Constants.Memory.ByteMask);
                    cpu.poke(cpu.rPC + 1, (memoryLocation >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                    cpu.poke(memoryLocation, memoryValue);
                    cpu.rA = accumulatorValue;
                    operation.execute(cpu);
                });

                it("then should add the number at the address", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });

        describe("ADC Absolute X", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryAbsoluteX();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
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

                it("then should add the number at the address adjusted by the X offset", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });

        describe("ADC Absolute Y", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryAbsoluteY();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
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

                it("then should add the number at the address adjusted by the Y offset", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });

        describe("ADC Indexed Indirect X", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryIndexedIndirectX();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
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

                it("then should locate the address at the zero page offset and use the value at that address to add", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });

        describe("ADC Indirect Indexed Y", () => {

            beforeEach(() => {
                operation = new Emulator.AddWithCarryIndirectIndexedY();
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
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

                it("then should locate the address at the zero page offset then take that addres plus the y offset to add", () => {
                    expect(cpu.rA).toBe(memoryValue + accumulatorValue);
                });

            });
        });
    });
}