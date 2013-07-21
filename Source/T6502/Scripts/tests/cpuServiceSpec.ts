/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/services/cpuService.ts'/>

module Tests {

    describe("cpu service", () => {

        var cpuSvc: Services.ICpuService;
  
        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject((cpuService) => {
                cpuSvc = cpuService;
            });
        });

        describe("given cpu service when getCpu called", () => {
            it("then should return a cpu instance", () => {        
                expect(cpuSvc.getCpu()).toBeDefined();                
            });
        });

        describe("given cpu service when getCompiler called", () => {
            it("then should return a compiler instance", () => {        
                expect(cpuSvc.getCompiler()).toBeDefined();                
            });
        });
        
    });
}