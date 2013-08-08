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

    describe("Decrement Specs", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;
        var regularValue: number = 0x12;
        var regularValueAfter: number = regularValue - 1;
        var negativeValue: number = 0x82;
        var negativeValueAfter: number = negativeValue - 1;
        var flipValue: number = 0x00;
        var flipValueAfter: number = 0xFF; 
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

        describe("DEX - Decrement X Register", () => {

            beforeEach(() => {
                operation = new Emulator.DecXSingle();
            });

            describe("given any value greater than 0x0", () => {
                beforeEach(() => {
                    cpu.rX = regularValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the X register to one less than the value", () => {
                    expect(cpu.rX)
                        .toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative value greater than 0x80", () => {
                beforeEach(() => {
                    cpu.rX = negativeValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the X register to one less than the value and set the negative flag", () => {
                    expect(cpu.rX)
                        .toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0x00", () => {
                beforeEach(() => {
                    cpu.rX = flipValue
                    operation.execute(cpu);                    
                }); 

                it("then should set the X register to 0xFF (roll) and set the negative flag", () => {
                    expect(cpu.rX).toBe(flipValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                });            
            });
        });

        describe("DEY - Decrement Y Register", () => {

            beforeEach(() => {
                operation = new Emulator.DecYSingle();
            });

            describe("given any value greater than 0x0", () => {
                beforeEach(() => {
                    cpu.rY = regularValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the Y register to one less than the value", () => {
                    expect(cpu.rY)
                        .toBe(regularValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given any negative greater than 0x80", () => {
                beforeEach(() => {
                    cpu.rY = negativeValue;
                    operation.execute(cpu);                    
                }); 

                it("then should set the Y register to one less than the value and set the negative flag", () => {
                    expect(cpu.rY)
                        .toBe(negativeValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                });            
            });

            describe("given 0x00", () => {
                beforeEach(() => {
                    cpu.rY = flipValue
                    operation.execute(cpu);                    
                }); 

                it("then should set the Y register to 0xFF (roll) and set the negative flag", () => {
                    expect(cpu.rY).toBe(flipValueAfter);                    
                    expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
                    expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
                });            
            });
        });        
    });
}
