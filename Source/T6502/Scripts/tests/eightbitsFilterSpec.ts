/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/filters/eightbits.ts'/>

module Tests {

    describe("eightbits filter", () => {
  
        beforeEach(() => {    
            module('app');          
        });

        describe("given invalid input when called", () => {
            it("then should return the value back", () => {        
                return inject(($filter) => {
                var filter: ng.IFilterService = $filter('eightbits');
                expect(filter('zoo')).toEqual('zoo');
                });
            });
        });

        describe("given valid input when called", () => {
          
            it("then should return the bits for the number", () => {
                return inject(($filter) => {
                    var filter: any = $filter('eightbits');
                    expect(filter(0xff)).toEqual('11111111');
                });
            });
            
            it("with smaller number then should pad bits to 8 places", () => {
                return inject(($filter) => {
                    var filter: any = $filter('eightbits');
                    expect(filter(0x01)).toEqual('00000001');
                });
            });
          
        });
    });
}