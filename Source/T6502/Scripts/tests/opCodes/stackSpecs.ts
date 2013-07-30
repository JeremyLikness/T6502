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

    describe("Stack Operations", () => {

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

        describe("PHA - Push Accumulator to Stack", () => {
            beforeEach(() => {
                operation = new Emulator.PushAccumulatorSingle();
            });

            describe("given value in accumulator", () => {
                beforeEach(() => {
                    cpu.rA = 0x12;
                    operation.execute(cpu);
                }); 

                it("then should push the value to the stack", () => {
                    expect(cpu.stackPop()).toBe(0x12);
                });
            });            
        });

        describe("PLA - Pull Accumulator from Stack", () => {
            beforeEach(() => {
                operation = new Emulator.PullAccumulatorSingle();
            });

            describe("given value in stack", () => {
                beforeEach(() => {
                    cpu.stackPush(0x12);
                    operation.execute(cpu);
                }); 

                it("then should set the accumulator to the value at the top of the stack", () => {
                    expect(cpu.rA).toBe(0x12);
                });
            });            
        });
    });
}