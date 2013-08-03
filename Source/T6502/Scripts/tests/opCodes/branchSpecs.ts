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

    describe("Branch Operations", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;        
        var flagToTest: number;
        var flagName: string;
        var reverseFlag: boolean; 
        var address: number;

        function setText(): string {
            return reverseFlag ? "not branch" : "branch"; 
        }

        function resetText(): string {
            return reverseFlag ? "branch" : "not branch"; 
        }

        function branchtest(): void {
        
            describe("Given " + flagName + " is set", () => {

                beforeEach(() => {
                    cpu.setFlag(flagToTest, true);
                    cpu.poke(cpu.rPC, 0x06); 
                    address = cpu.rPC; 
                    operation.execute(cpu); 
                });

                it("then should " + setText(), () => {
                    expect(cpu.rPC).toBe(
                        reverseFlag ? address + 1 : address + 7);
                });
            });

            describe("Given " + flagName + " is not set", () => {

                beforeEach(() => {
                    cpu.setFlag(flagToTest, false);
                    cpu.poke(cpu.rPC, 0x06); 
                    address = cpu.rPC; 
                    operation.execute(cpu); 
                });

                it("then should " + resetText(), () => {
                    expect(cpu.rPC).toBe(
                        reverseFlag ? address + 7 : address + 1);
                });
            });
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

        describe("BMI - Branch on minus", () => {            
            operation = new Emulator.BranchMinusRelative();
            flagToTest = Constants.ProcessorStatus.NegativeFlagSet;
            flagName = "Negative Flag"; 
            reverseFlag = false;                
            branchtest();                      
        });

        describe("BPL - Branch on plus (positive)", () => {            
            operation = new Emulator.BranchPlusRelative();
            flagToTest = Constants.ProcessorStatus.NegativeFlagSet;
            flagName = "Negative Flag"; 
            reverseFlag = true;                
            branchtest();                      
        });

        
        describe("BEQ - Branch on zero (equal)", () => {            
            operation = new Emulator.BranchEqualRelative();
            flagToTest = Constants.ProcessorStatus.ZeroFlagSet;
            flagName = "Zero Flag"; 
            reverseFlag = false;                
            branchtest();                      
        });

        describe("BNE - Branch on not zero (not equal)", () => {            
            operation = new Emulator.BranchNotEqualRelative();
            flagToTest = Constants.ProcessorStatus.ZeroFlagSet;
            flagName = "Zero Flag"; 
            reverseFlag = true;                
            branchtest();                      
        });

        
        describe("BVC - Branch on overflow clear", () => {            
            operation = new Emulator.BranchOverflowClearRelative();
            flagToTest = Constants.ProcessorStatus.OverflowFlagSet;
            flagName = "Overflow Flag"; 
            reverseFlag = true;                
            branchtest();                      
        });

        describe("BVC - Branch on overflow set", () => {            
            operation = new Emulator.BranchOverflowSetRelative();
            flagToTest = Constants.ProcessorStatus.OverflowFlagSet;
            flagName = "Overflow Flag"; 
            reverseFlag = false;                
            branchtest();                      
        });

        
        describe("BCS - Branch on carry set", () => {            
            operation = new Emulator.BranchCarrySetRelative();
            flagToTest = Constants.ProcessorStatus.CarryFlagSet;
            flagName = "Carry Flag"; 
            reverseFlag = false;                
            branchtest();                      
        });

        describe("BCC - Branch on carry clear", () => {            
            operation = new Emulator.BranchCarryClearRelative();
            flagToTest = Constants.ProcessorStatus.CarryFlagSet;
            flagName = "Carry Flag"; 
            reverseFlag = true;                
            branchtest();                      
        });

    });
}