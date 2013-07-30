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
    });
}