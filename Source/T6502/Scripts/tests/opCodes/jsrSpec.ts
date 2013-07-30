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

    describe("JSR - Jump to Subroutine", () => {

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

        describe("JSR Absolute", () => {

            var address: number; 

            beforeEach(() => {
                operation = new Emulator.JmpSubroutineAbsolute();
            });

            describe("given absolute address", () => {
                beforeEach(() => {
                    cpu.poke(cpu.rPC, 0x00);
                    cpu.poke(cpu.rPC + 1, 0xC0);
                    address = cpu.rPC + 2;
                    operation.execute(cpu);                    
                }); 

                it("then should push the PC address less 1 on the stack", () => {
                    var adjustedAddress: number = address - 1; 
                    expect(cpu.peek(cpu.rSP + Constants.Memory.Stack))
                        .toBe(adjustedAddress & Constants.Memory.ByteMask);
                    expect(cpu.peek(cpu.rSP + Constants.Memory.Stack + 1))
                        .toBe((adjustedAddress >> Constants.Memory.BitsInByte) 
                        & Constants.Memory.ByteMask);
                });

                it("then should set the PC to the target address", () => {
                    expect(cpu.rPC).toBe(0xC000);
                });
            });
        });
    });
}